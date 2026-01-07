import logging
from pathlib import Path
from typing import Optional, Tuple

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, Model
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau

import sys
sys.path.append(str(Path(__file__).parent.parent))
from config import CNN_CONFIG, MODEL_DIR, IPC_PHASE_MAPPING

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SpatialAttention(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        self.conv = layers.Conv2D(1, kernel_size=7, padding="same", activation="sigmoid")

    def call(self, inputs):
        avg_pool = tf.reduce_mean(inputs, axis=-1, keepdims=True)
        max_pool = tf.reduce_max(inputs, axis=-1, keepdims=True)
        concat = tf.concat([avg_pool, max_pool], axis=-1)
        attention = self.conv(concat)
        return inputs * attention


class TemporalAttention(layers.Layer):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def build(self, input_shape):
        self.attention_dense = layers.Dense(input_shape[-1], activation="tanh")
        self.attention_score = layers.Dense(1)

    def call(self, inputs):
        attention = self.attention_dense(inputs)
        scores = self.attention_score(attention)
        weights = tf.nn.softmax(scores, axis=1)
        context = tf.reduce_sum(inputs * weights, axis=1)
        return context, weights


def build_conv3d_block(
    x: tf.Tensor,
    filters: int,
    kernel_size: Tuple[int, int, int] = (3, 3, 3),
    pool_size: Tuple[int, int, int] = (1, 2, 2),
    dropout_rate: float = 0.3,
    name_prefix: str = "",
) -> tf.Tensor:
    x = layers.Conv3D(
        filters,
        kernel_size,
        padding="same",
        name=f"{name_prefix}_conv3d",
    )(x)
    x = layers.BatchNormalization(name=f"{name_prefix}_bn")(x)
    x = layers.ReLU(name=f"{name_prefix}_relu")(x)
    x = layers.MaxPooling3D(pool_size, name=f"{name_prefix}_pool")(x)
    if dropout_rate > 0:
        x = layers.Dropout(dropout_rate, name=f"{name_prefix}_dropout")(x)
    return x


def build_spatiotemporal_cnn(
    input_shape: Tuple[int, int, int, int] = None,
    num_classes: int = 5,
    feature_dim: int = None,
    dropout_rate: float = None,
) -> Model:
    if input_shape is None:
        input_shape = (
            CNN_CONFIG["time_steps"],
            CNN_CONFIG["input_height"],
            CNN_CONFIG["input_width"],
            CNN_CONFIG["channels"],
        )
    if feature_dim is None:
        feature_dim = CNN_CONFIG["feature_dim"]
    if dropout_rate is None:
        dropout_rate = CNN_CONFIG["dropout_rate"]

    inputs = layers.Input(shape=input_shape, name="precipitation_input")

    x = build_conv3d_block(
        inputs,
        filters=32,
        kernel_size=(3, 3, 3),
        pool_size=(1, 2, 2),
        dropout_rate=dropout_rate,
        name_prefix="block1",
    )

    x = build_conv3d_block(
        x,
        filters=64,
        kernel_size=(3, 3, 3),
        pool_size=(2, 2, 2),
        dropout_rate=dropout_rate,
        name_prefix="block2",
    )

    x = build_conv3d_block(
        x,
        filters=128,
        kernel_size=(3, 3, 3),
        pool_size=(2, 2, 2),
        dropout_rate=dropout_rate,
        name_prefix="block3",
    )

    x = layers.Conv3D(256, (2, 2, 2), padding="same", name="block4_conv3d")(x)
    x = layers.BatchNormalization(name="block4_bn")(x)
    x = layers.ReLU(name="block4_relu")(x)

    x = layers.GlobalAveragePooling3D(name="global_avg_pool")(x)

    features = layers.Dense(feature_dim, activation="relu", name="feature_layer")(x)
    features = layers.Dropout(dropout_rate, name="feature_dropout")(features)

    outputs = layers.Dense(num_classes, activation="softmax", name="classification")(features)

    model = Model(inputs=inputs, outputs=outputs, name="SpatiotemporalCNN")

    return model


def build_conv2d_lstm_model(
    input_shape: Tuple[int, int, int, int] = None,
    num_classes: int = 5,
    feature_dim: int = None,
    dropout_rate: float = None,
) -> Model:
    if input_shape is None:
        input_shape = (
            CNN_CONFIG["time_steps"],
            CNN_CONFIG["input_height"],
            CNN_CONFIG["input_width"],
            CNN_CONFIG["channels"],
        )
    if feature_dim is None:
        feature_dim = CNN_CONFIG["feature_dim"]
    if dropout_rate is None:
        dropout_rate = CNN_CONFIG["dropout_rate"]

    inputs = layers.Input(shape=input_shape, name="precipitation_input")

    cnn_encoder = keras.Sequential([
        layers.Conv2D(32, (3, 3), padding="same", activation="relu"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), padding="same", activation="relu"),
        layers.BatchNormalization(),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(128, (3, 3), padding="same", activation="relu"),
        layers.BatchNormalization(),
        layers.GlobalAveragePooling2D(),
    ], name="cnn_encoder")

    x = layers.TimeDistributed(cnn_encoder, name="time_distributed_cnn")(inputs)

    attention_layer = TemporalAttention(name="temporal_attention")
    x, attention_weights = attention_layer(x)

    features = layers.Dense(feature_dim, activation="relu", name="feature_layer")(x)
    features = layers.Dropout(dropout_rate, name="feature_dropout")(features)

    outputs = layers.Dense(num_classes, activation="softmax", name="classification")(features)

    model = Model(inputs=inputs, outputs=outputs, name="Conv2DLSTM")

    return model


def build_convlstm_model(
    input_shape: Tuple[int, int, int, int] = None,
    num_classes: int = 5,
    feature_dim: int = None,
    dropout_rate: float = None,
) -> Model:
    if input_shape is None:
        input_shape = (
            CNN_CONFIG["time_steps"],
            CNN_CONFIG["input_height"],
            CNN_CONFIG["input_width"],
            CNN_CONFIG["channels"],
        )
    if feature_dim is None:
        feature_dim = CNN_CONFIG["feature_dim"]
    if dropout_rate is None:
        dropout_rate = CNN_CONFIG["dropout_rate"]

    inputs = layers.Input(shape=input_shape, name="precipitation_input")

    x = layers.ConvLSTM2D(
        filters=32,
        kernel_size=(3, 3),
        padding="same",
        return_sequences=True,
        name="convlstm1",
    )(inputs)
    x = layers.BatchNormalization(name="bn1")(x)

    x = layers.ConvLSTM2D(
        filters=64,
        kernel_size=(3, 3),
        padding="same",
        return_sequences=True,
        name="convlstm2",
    )(x)
    x = layers.BatchNormalization(name="bn2")(x)

    x = layers.ConvLSTM2D(
        filters=64,
        kernel_size=(3, 3),
        padding="same",
        return_sequences=False,
        name="convlstm3",
    )(x)
    x = layers.BatchNormalization(name="bn3")(x)

    attention = SpatialAttention(name="spatial_attention")(x)

    x = layers.GlobalAveragePooling2D(name="global_pool")(attention)

    features = layers.Dense(feature_dim, activation="relu", name="feature_layer")(x)
    features = layers.Dropout(dropout_rate, name="feature_dropout")(features)

    outputs = layers.Dense(num_classes, activation="softmax", name="classification")(features)

    model = Model(inputs=inputs, outputs=outputs, name="ConvLSTM")

    return model


class HungerPredictionModel:
    def __init__(
        self,
        model_type: str = "spatiotemporal",
        num_classes: int = 5,
        model_version: str = "v1.0",
    ):
        self.model_type = model_type
        self.num_classes = num_classes
        self.model_version = model_version
        self.model: Optional[Model] = None
        self.feature_extractor: Optional[Model] = None
        self.history = None

    def build(self) -> Model:
        if self.model_type == "spatiotemporal":
            self.model = build_spatiotemporal_cnn(num_classes=self.num_classes)
        elif self.model_type == "conv2d_lstm":
            self.model = build_conv2d_lstm_model(num_classes=self.num_classes)
        elif self.model_type == "convlstm":
            self.model = build_convlstm_model(num_classes=self.num_classes)
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")

        self._build_feature_extractor()

        return self.model

    def _build_feature_extractor(self):
        if self.model is None:
            raise ValueError("Model must be built first")

        feature_layer = self.model.get_layer("feature_layer")
        self.feature_extractor = Model(
            inputs=self.model.input,
            outputs=feature_layer.output,
            name="feature_extractor",
        )

    def compile(
        self,
        learning_rate: float = None,
        class_weights: Optional[dict] = None,
    ):
        if learning_rate is None:
            learning_rate = CNN_CONFIG["learning_rate"]

        optimizer = keras.optimizers.Adam(learning_rate=learning_rate)

        self.model.compile(
            optimizer=optimizer,
            loss="sparse_categorical_crossentropy",
            metrics=["accuracy"],
        )

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        epochs: int = None,
        batch_size: int = None,
        class_weight: Optional[dict] = None,
    ):
        if epochs is None:
            epochs = CNN_CONFIG["epochs"]
        if batch_size is None:
            batch_size = CNN_CONFIG["batch_size"]

        callbacks = [
            EarlyStopping(
                monitor="val_loss",
                patience=CNN_CONFIG["early_stopping_patience"],
                restore_best_weights=True,
            ),
            ReduceLROnPlateau(
                monitor="val_loss",
                factor=0.5,
                patience=5,
                min_lr=1e-6,
            ),
            ModelCheckpoint(
                filepath=str(MODEL_DIR / f"best_model_{self.model_version}.keras"),
                monitor="val_loss",
                save_best_only=True,
            ),
        ]

        self.history = self.model.fit(
            X_train,
            y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            class_weight=class_weight,
        )

        return self.history

    def extract_features(self, X: np.ndarray) -> np.ndarray:
        if self.feature_extractor is None:
            raise ValueError("Feature extractor not built")

        return self.feature_extractor.predict(X)

    def predict(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        probabilities = self.model.predict(X)
        predictions = np.argmax(probabilities, axis=1) + 1
        return predictions, probabilities

    def predict_single(self, sequence: np.ndarray) -> dict:
        if len(sequence.shape) == 4:
            sequence = np.expand_dims(sequence, axis=0)

        predictions, probabilities = self.predict(sequence)
        features = self.extract_features(sequence)

        ipc_phase = int(predictions[0])
        prob_dict = {
            f"phase_{i+1}": float(probabilities[0, i])
            for i in range(self.num_classes)
        }

        return {
            "ipc_phase_predicted": ipc_phase,
            "ipc_phase_probability": prob_dict,
            "confidence_score": float(np.max(probabilities[0])),
            "risk_level": IPC_PHASE_MAPPING[ipc_phase],
            "feature_vector": features[0].tolist(),
        }

    def save(self, path: Optional[Path] = None):
        if path is None:
            path = MODEL_DIR / f"hunger_model_{self.model_version}.keras"

        self.model.save(path)
        logger.info(f"Model saved to {path}")

    def load(self, path: Optional[Path] = None):
        if path is None:
            path = MODEL_DIR / f"hunger_model_{self.model_version}.keras"

        self.model = keras.models.load_model(
            path,
            custom_objects={
                "SpatialAttention": SpatialAttention,
                "TemporalAttention": TemporalAttention,
            },
        )
        self._build_feature_extractor()
        logger.info(f"Model loaded from {path}")

    def summary(self):
        if self.model:
            self.model.summary()


def compute_class_weights(y: np.ndarray) -> dict:
    from sklearn.utils.class_weight import compute_class_weight

    classes = np.unique(y)
    weights = compute_class_weight("balanced", classes=classes, y=y)
    return dict(zip(classes, weights))


if __name__ == "__main__":
    print("Building Spatiotemporal CNN...")
    model = HungerPredictionModel(model_type="spatiotemporal")
    model.build()
    model.compile()
    model.summary()

    print("\n" + "=" * 50)
    print("\nBuilding ConvLSTM model...")
    model2 = HungerPredictionModel(model_type="convlstm")
    model2.build()
    model2.compile()
    model2.summary()

    print("\n" + "=" * 50)
    print("\nTesting prediction pipeline...")
    dummy_input = np.random.rand(1, 12, 64, 64, 1)
    result = model.predict_single(dummy_input)
    print(f"Predicted IPC Phase: {result['ipc_phase_predicted']}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Confidence: {result['confidence_score']:.3f}")
    print(f"Feature vector shape: {len(result['feature_vector'])}")
