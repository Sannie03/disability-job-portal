"""The repository can run letter recognition without optional I3D code/weights."""
from pathlib import Path


def load_word_recognizer():
    root = Path(__file__).resolve().parents[1]
    architecture = root / "engine" / "word_i3d_recognizer.py"
    model = root / "models" / "word_i3d" / "asl100.pt"
    labels = root / "models" / "word_i3d" / "wlasl_class_list.txt"
    if not all(path.is_file() for path in (architecture, model, labels)):
        print("I3D code/weights are unavailable; using LETTER mode (SVM).")
        return None
    from engine.word_i3d_recognizer import WordI3DRecognizer
    return WordI3DRecognizer(model_path=str(model), class_list_path=str(labels),
                             i3d_module_path=str(root / "i3d"), num_classes=100)
