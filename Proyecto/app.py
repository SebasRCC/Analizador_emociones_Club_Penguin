from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

app = Flask(__name__)
CORS(app)

# Carga modelo y tokenizer
MODEL_NAME = "finiteautomata/beto-sentiment-analysis"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

id2label = {
    0: "NEGATIVO",
    1: "NEUTRO",
    2: "POSITIVO"
}

@app.route('/')
def index():
    return render_template('index.html')  # muestra la página

@app.route('/penguin.glb')
def modelo():
    return send_from_directory('templates', 'penguin.glb')  # servir el modelo desde la carpeta templates

@app.route('/script.js')
def script():
    return send_from_directory('templates', 'script.js')  # si también lo tienes allí

@app.route('/style.css')
def style():
    return send_from_directory('templates', 'style.css')

@app.route('/analizar', methods=['POST'])
def analizar_sentimiento():
    data = request.get_json()
    texto = data.get("texto", "")
    inputs = tokenizer(texto, return_tensors="pt", truncation=True, padding=True)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_class_id = int(torch.argmax(logits, dim=1))
        label = id2label[predicted_class_id]
        scores = torch.softmax(logits, dim=1).tolist()[0]

    return jsonify({
        "sentimiento": label,
        "confianza": scores[predicted_class_id],
        "puntajes": {
            "NEGATIVO": scores[0],
            "NEUTRO": scores[1],
            "POSITIVO": scores[2]
        }
    })

if __name__ == '__main__':
    app.run(debug=True)
