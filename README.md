# Highly Available Web Application on AWS

## Overview

This project demonstrates a production-like AWS infrastructure focused on availability, scalability, and network isolation.

The system exposes a simple web application through an Application Load Balancer and distributes traffic across EC2 instances managed by an Auto Scaling Group. A Node.js backend connects to a PostgreSQL database hosted on Amazon RDS.

The goal is not application complexity, but demonstrating how real-world cloud infrastructure is designed and operated.

---

## Architecture

High-level flow:

Client → ALB → EC2 (Nginx + Node.js) → RDS

* Multi-AZ deployment (high availability)
* Private subnets for compute and database
* Public subnets for ALB and NAT Gateway
* Immutable deployments via Auto Scaling Instance Refresh

---

## Tech Stack

* **AWS**: VPC, EC2, Auto Scaling, ALB, RDS, NAT Gateway
* **Backend**: Node.js (Express)
* **Frontend**: HTML/CSS (served via Nginx)
* **CI/CD**: GitHub Actions

---

## Key Features

* Network isolation (public vs private subnets)
* Load balancing with health checks
* Auto Scaling with self-healing instances
* Immutable deployments (no manual changes to EC2)
* Secure database access (private RDS)

---

## Documentation

Full architecture, decisions, and challenges:

👉 `architecture.md`
