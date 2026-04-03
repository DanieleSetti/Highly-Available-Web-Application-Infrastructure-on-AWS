Static Web App CI/CD Pipeline with Staging & Production on AWS - This project focuses on understanding deployment workflows and infrastructure behavior rather than building complex application logic.

## Overview

This project implements a CI/CD pipeline for a static web application using AWS S3 and CloudFront.

It supports two environments (staging and production) with automatic deployments triggered by GitHub Actions based on branch changes.

The goal is to simulate a production-like deployment workflow while keeping the infrastructure simple.

## Architecture

- GitHub repository with two branches:
  - `main` → production
  - `staging` → staging

- CI/CD:
  - GitHub Actions pipeline triggered on push

- AWS:
  - S3 buckets (one per environment)
  - CloudFront distributions (one per environment)

Flow:

GitHub → GitHub Actions → S3 → CloudFront → User

## CI/CD Pipeline

On every push:

1. Code is checked out
2. AWS credentials are configured via GitHub Secrets
3. Deployment logic:
   - `main` branch → production S3 bucket
   - `staging` branch → staging S3 bucket
4. CloudFront cache is invalidated to ensure fresh content delivery

## Secrets Management

Sensitive credentials are stored using GitHub Actions Secrets:

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- CLOUDFRONT_*_DISTRIBUTION_ID

Note: Access keys are used for simplicity. In production, OIDC-based authentication should be preferred.

## Challenges & Solutions

### 1. CloudFront AccessDenied
Cause:
- CloudFront was pointing to S3 REST endpoint

Solution:
- Switched to S3 static website endpoint

---

### 2. Assets not loading
Cause:
- Case sensitivity mismatch (Assets vs assets)

Solution:
- Standardized all paths to lowercase

---

### 3. Cache not updating
Cause:
- CloudFront caching

Solution:
- Implemented invalidation step in pipeline


## Trade-offs

- Used public S3 buckets instead of OAC for simplicity
- Used access keys instead of OIDC for faster setup
- Used cache invalidation instead of versioned assets

These choices reduce complexity but would be reconsidered in production.

## Improvements

- Replace access keys with OIDC authentication
- Implement asset versioning instead of invalidation
- Manage infrastructure with Terraform
- Add testing stage in pipeline

## Usage

Push to:

- `staging` → deploys to staging
- `main` → deploys to production

GitHub → Actions → S3 → CloudFront → User