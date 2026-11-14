# Synthetic Video Detection using Transfer Learning ( Varuna)

![Status](https://img.shields.io/badge/Status-Completed-success)
[![Live Demo](https://img.shields.io/badge/Demo-Vercel-black)](https://synthetic-video-detection-using-tra.vercel.app/)

## Overview
Addressing the growing impact of harmful AI-generated videos on vulnerable groups, this project provides an end-to-end detection solution leveraging Transfer Learning. The system is fully implemented and deployed as an interactive web application.

🔗 **Live Website:** [synthetic-video-detection-using-tra.vercel.app](https://synthetic-video-detection-using-tra.vercel.app/)

## Model Architecture & Pipeline
Our detection pipeline processes video frames through three main stages:
1. **Feature Extraction:** Extracts rich visual-semantic embeddings from video frames via **CLIP**.
2. **Temporal & Spatial Aggregation:** Synthesizes frame-level information using a **Cross-Attention** mechanism.
3. **Classification:** Identifies synthetic artifacts and classifies content using **LSTM** and **Vision Transformer (ViT)** models.

## Repository Structure
* `frontend/` - Source code for the interactive web interface (deployed on Vercel).
