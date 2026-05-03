# News-based Stock Red Flag Detection API

## Overview

The News-based Stock Red Flag Detection API is a backend system designed to identify potential corporate risks from financial news text.

This project combines:

- FinBERT-based financial sentiment analysis
- Rule-based red flag detection
- Risk score calculation
- LLM-compatible explanation generation
- RESTful API endpoints using FastAPI

## Backend Responsibility

This backend implements the following pipeline:

Client Request  
→ FastAPI Router  
→ Service Layer  
→ AI Module  
→ Repository Layer  
→ JSON Response

## Features

- Analyze financial news text
- Search company-related news using Naver News API
- Detect red flag keywords
- Classify risk factors into legal, regulatory, financial, management, and market risks
- Calculate risk score
- Classify risk level as Low, Medium, or High
- Generate explainable risk reports
- Store results in an in-memory repository

## Project Structure

```txt
backend/
├── app/
│   ├── main.py
│   ├── api/
│   ├── ai/
│   ├── services/
│   ├── models/
│   ├── database/
│   ├── core/
│   └── utils/
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md