# News-based Stock Red Flag Detection API

## Overview

The News-based Stock Red Flag Detection API is a financial analysis system designed to identify potential corporate risks ("Red Flags") from news text.

This system integrates quantitative sentiment analysis and qualitative reasoning to provide an Explainable AI (XAI) approach to investment risk assessment.

- FinBERT: financial sentiment analysis  
- Rule-based engine: risk scoring  
- LLM: reasoning and explanation generation  

The goal is to move beyond simple scores and provide clear explanations of risk.

---

## System Architecture

    Client (React)
          ↓
    FastAPI Router
          ↓
    Service Layer
          ↓
    AI Module (FinBERT + LLM)
          ↓
    Database (PostgreSQL / MongoDB)

### Design Principles

- Modular architecture for scalability  
- Layered structure for maintainability  
- Asynchronous processing for performance  

---

## Tech Stack

### Backend / AI
- Python  
- FastAPI  
- PyTorch  
- Transformers  

### Frontend
- JavaScript  
- React  

### Database
- PostgreSQL  
- MongoDB  

### Deployment
- Docker  

---

## AI Pipeline

### 1. Quantitative Sentiment Analysis
FinBERT is used to extract sentiment scores (positive, neutral, negative) from financial news text.

### 2. Risk Scoring Engine
A rule-based engine maps sentiment scores and predefined risk keywords such as:
- investigation  
- lawsuit  
- earnings decline  

into discrete risk levels:

    Low / Medium / High

### 3. Qualitative Reasoning (LLM)
The LLM interprets detected red flags and generates natural language explanations describing the underlying risk and its potential impact.

---

## Key Features

- Red Flag Detection from news text  
- Risk factor classification (regulatory, financial, legal)  
- Explainable AI reports  
- RESTful API endpoints  

---

## API Endpoints

### Analyze News

    POST /analyze

Executes the full AI pipeline on input news text.

### Get Result

    GET /results/{id}

Retrieves stored analysis results.

### Generate Report

    POST /report

Generates a summarized risk report.

---

## Testing and Quality Assurance

### Unit Testing
- Validation of risk scoring logic  
- Verification of AI output format (JSON)

### Integration Testing
- End-to-end data flow validation across FastAPI, AI modules, and database  

---

## Deployment

    docker build -t redflag-api .
    docker run -p 8000:8000 redflag-api

Docker ensures consistent runtime environments and stable execution of AI dependencies.

---

## Expected Impact

### Information Filtering
Reduces noise in financial news and highlights high-impact risk signals.

### Decision Support
Provides not only a risk score but also interpretable reasoning behind it.

### Scalability
Designed to support real-time news ingestion and multi-asset analysis in future extensions.

---

## Future Work

- Real-time news crawling and streaming analysis  
- Integration with financial data sources  
- Personalized risk profiling models  

---

## Summary

This project delivers an explainable, modular, and scalable system for extracting actionable risk insights from financial news using a hybrid AI approach.
