## 1. Overview

This project demonstrates the design and implementation of a production-like AWS infrastructure for a web application, focusing on availability, scalability, and network isolation rather than application complexity.

The system exposes a simple web application through an Application Load Balancer and distributes traffic across multiple EC2 instances managed by an Auto Scaling Group. The application includes a minimal backend service connected to a PostgreSQL database hosted on Amazon RDS, where each request updates a visit counter.

The primary goal of this project is not to build a complex application, but to demonstrate how a real-world cloud infrastructure is structured and operated. It reflects common patterns used in production environments, including multi-AZ deployment, private networking, load balancing, automated instance management, and CI/CD-driven updates.

The infrastructure is fully deployed on AWS and designed to be reproducible and automatically updated. Application changes are delivered through a GitHub-based workflow, triggering instance refresh in the Auto Scaling Group to ensure consistent and immutable deployments.

### Problem Addressed

Many beginner-level projects focus on individual AWS services without demonstrating how they interact as a system. This project addresses that gap by implementing a cohesive architecture that:

* isolates critical components within private subnets
* exposes only controlled entry points via a load balancer
* enables horizontal scaling through Auto Scaling
* maintains a persistent data layer using a managed database
* supports automated deployment without direct instance access

### Technologies Used

* **Compute & Scaling:** Amazon EC2, Auto Scaling Group, Launch Templates
* **Networking:** Amazon VPC, Public/Private Subnets, Internet Gateway, NAT Gateway
* **Load Balancing:** Application Load Balancer (ALB)
* **Database:** Amazon RDS (PostgreSQL)
* **Application Layer:** Node.js (Express) backend + static HTML/CSS frontend
* **CI/CD:** GitHub Actions (triggering instance refresh)
* **Web Server:** Nginx (reverse proxy for backend)

The project prioritizes architectural correctness and operational behavior over feature complexity, reflecting how infrastructure is designed and evaluated in real-world engineering environments.


## 2. Architecture

The system is designed as a multi-tier, production-like architecture deployed across multiple Availability Zones to ensure high availability and fault tolerance.

### High-Level Flow

Client → Application Load Balancer → EC2 (Nginx + Node.js) → Amazon RDS (PostgreSQL)

---

### Network Layer (VPC Design)

The infrastructure is deployed inside a custom VPC (`10.0.0.0/16`) spanning two Availability Zones.

Each AZ contains:

* **Public Subnet** → hosts the Application Load Balancer and NAT Gateway
* **Private Subnet** → hosts EC2 instances and RDS

Key components:

* **Internet Gateway (IGW)** enables inbound/outbound internet access for public resources
* **NAT Gateway (single AZ)** allows private instances to access the internet without exposing them publicly
* **S3 VPC Endpoint** reduces NAT traffic and improves cost efficiency for S3 access

#### Traffic Behavior

* **Inbound traffic**
  Internet → IGW → ALB (public subnet) → EC2 (private subnet)

* **Outbound traffic (private instances)**
  EC2 → NAT Gateway → IGW → Internet

Important constraint:
Private instances do not have public IPs and cannot receive inbound traffic directly.

---

### Load Balancing Layer

An **Application Load Balancer (ALB)** is deployed across two public subnets (multi-AZ).

* Listens on HTTP (port 80)
* Routes traffic to a target group of EC2 instances
* Performs health checks to ensure only healthy instances receive traffic

Security model:

* ALB is the only publicly accessible entry point
* EC2 instances accept traffic **only from the ALB security group**

---

### Compute Layer (Auto Scaling)

EC2 instances are managed by an **Auto Scaling Group (ASG)** using a Launch Template.

* Instances run in private subnets
* Desired capacity: multiple instances across AZs
* Automatically replaces unhealthy instances
* Supports rolling updates via instance refresh

#### Instance Initialization (User Data)

Each instance is provisioned at launch using User Data:

* Installs Nginx, Node.js, and dependencies
* Pulls application code from GitHub
* Configures and starts:

  * Nginx (serving frontend + reverse proxy)
  * Node.js backend (systemd service)

This ensures instances are **ephemeral and reproducible**.

---

### Application Layer

Each EC2 instance runs:

* **Nginx**

  * Serves static frontend (HTML/CSS)
  * Proxies `/visit` requests to backend

* **Node.js (Express) backend**

  * Exposes `/visit` endpoint
  * Increments and returns a counter stored in the database

---

### Data Layer (RDS)

* **Amazon RDS (PostgreSQL)** deployed in private subnets
* No public access
* Security Group allows access only from EC2 instances

Database role:

* Stores persistent application state (visit counter)

---

### CI/CD and Deployment Model

Deployment is based on **immutable infrastructure principles**.

Workflow:

1. Code is pushed to GitHub
2. GitHub Actions triggers deployment
3. Auto Scaling Group performs **Instance Refresh**
4. New instances launch and pull updated code via User Data
5. Old instances are gradually terminated

Key characteristic:

* No direct modification of running instances
* Updates are applied by replacing infrastructure

---

### Security Design

* No public access to EC2 or RDS
* All inbound traffic flows through ALB only
* Private subnets isolate compute and database layers
* NAT Gateway provides outbound access without exposure
* IAM roles used for instance-level permissions

---

### Architectural Trade-offs

* **Single NAT Gateway (cost optimization)**
  → Not fully fault-tolerant (AZ failure impacts outbound traffic)

* **Git-based deployment in User Data**
  → Simpler but less reproducible than artifact-based deployments

* **Backend and frontend on same instance**
  → Simpler design, but not ideal for scaling independently

---

### Key Design Principles Demonstrated

* Network isolation (public vs private subnets)
* Controlled entry points (ALB)
* Stateless compute + persistent data separation
* Horizontal scalability (Auto Scaling)
* Immutable deployments
* Multi-AZ availability

This architecture reflects common patterns used in real-world AWS environments while keeping the application layer intentionally simple.

## 3. Key Decisions & Trade-offs

This project was intentionally designed to reflect real-world architectural decisions rather than simply integrating AWS services.

---

### 1. Private Subnets for Compute and Database

**Decision:**
EC2 instances and RDS are deployed in private subnets with no public IP addresses.

**Why:**

* Reduces attack surface
* Prevents direct inbound access from the internet
* Forces all traffic through controlled entry points (ALB)

**Trade-off:**

* Requires additional components (NAT Gateway, SSM) for outbound access and management
* Adds complexity to debugging and connectivity

---

### 2. NAT Gateway for Outbound Internet Access

**Decision:**
Private instances access the internet via a NAT Gateway deployed in a public subnet.

**Why:**

* Enables outbound access (e.g., package installation, GitHub clone)
* Keeps instances non-public (no public IP)

**Trade-off:**

* Single NAT Gateway used → **not highly available**
* If the AZ hosting the NAT fails, private subnets in other AZs lose internet access

**Production alternative:**

* One NAT Gateway per Availability Zone (higher cost, higher resilience)

---

### 3. Application Load Balancer as Single Entry Point

**Decision:**
All inbound traffic is routed through an Application Load Balancer (ALB).

**Why:**

* Centralized entry point
* Enables health checks and traffic distribution
* Decouples clients from individual EC2 instances

**Trade-off:**

* Additional cost and latency layer
* Requires correct security group configuration (initial misconfiguration caused downtime)

---

### 4. Auto Scaling Group Instead of Static EC2

**Decision:**
EC2 instances are managed by an Auto Scaling Group (ASG) instead of manually created instances.

**Why:**

* Automatic recovery from failures
* Horizontal scalability
* Eliminates dependency on individual instances

**Trade-off:**

* Instances become ephemeral → cannot rely on manual changes
* Requires automation (User Data, CI/CD)

---

### 5. Immutable Deployment via Instance Refresh

**Decision:**
Application updates are deployed by replacing instances (Instance Refresh), not modifying them.

**Why:**

* Ensures consistency across instances
* Avoids configuration drift
* Aligns with production deployment practices

**Trade-off:**

* Slightly slower deployments
* Temporary increase in instance count during rolling updates

---

### 6. Git-Based Deployment in User Data

**Decision:**
Instances pull application code directly from GitHub during initialization.

**Why:**

* Simple to implement
* No need for artifact storage setup
* Enables automatic deployment on instance creation

**Trade-off:**

* No strict versioning of deployed artifacts
* Dependency on external GitHub availability
* Not fully reproducible (code may change over time)

**Production alternative:**

* CI builds a versioned artifact (e.g., S3, container registry)
* Instances pull a specific immutable version

---

### 7. Single Instance Architecture for Frontend + Backend

**Decision:**
Frontend (Nginx) and backend (Node.js) run on the same EC2 instance.

**Why:**

* Simpler setup
* Faster implementation
* Sufficient for project scope

**Trade-off:**

* Cannot scale frontend and backend independently
* Resource contention possible

---

### 8. Environment Variables for Secrets

**Decision:**
Database credentials are injected via environment variables in User Data.

**Why:**

* Simple and sufficient for a project
* Avoids hardcoding secrets in code

**Trade-off:**

* Not secure for production
* Secrets visible in instance configuration

**Production alternative:**

* AWS Systems Manager Parameter Store or Secrets Manager

---

### 9. S3 VPC Endpoint

**Decision:**
Enabled S3 Gateway Endpoint in the VPC.

**Why:**

* Reduces NAT Gateway traffic
* Lowers cost
* Improves network efficiency

**Trade-off:**

* Adds complexity to VPC configuration
* Limited to AWS internal traffic (not general internet)

---

### 10. Single NAT vs High Availability

**Explicit design compromise:**

The architecture intentionally uses:

* **Single NAT Gateway (cost optimization)**

Instead of:

* NAT per AZ (production standard)

**Reason:**

* Keep project cost low while still demonstrating architecture understanding

**Interview positioning:**
“I used a single NAT for cost efficiency, but in production I would deploy one NAT per AZ to avoid cross-AZ dependency.”

---

### Summary

This project prioritizes:

* Security (private subnets, controlled access)
* Scalability (Auto Scaling, ALB)
* Reproducibility (User Data, immutable instances)

While intentionally accepting:

* Reduced fault tolerance (single NAT)
* Simpler deployment model (Git-based instead of artifact-based)

to balance complexity, cost, and learning objectives.


## 4. Challenges & Lessons Learned

During the implementation, several non-trivial issues emerged that required debugging across networking, infrastructure, and application layers.

---

### 1. Missing Public IP on Public Instance

**Problem:**
An EC2 instance in a public subnet was unable to connect via SSH or SSM.

**Root Cause:**
The instance did not have a public IP assigned.
Even though the subnet had a route to the Internet Gateway, the instance itself could not communicate externally.

**Resolution:**
Enabled public IP assignment.

**Lesson:**
A public subnet does not make an instance public — the instance itself must have a public IP.

---

### 2. Understanding NAT vs Internet Gateway

**Problem:**
Initial confusion about why private instances could access the internet without a public IP, while public ones could not.

**Root Cause:**
Misunderstanding of how NAT Gateway performs source IP translation.

**Resolution:**
Analyzed traffic flow:

* Private EC2 → NAT → IGW → Internet
* NAT replaces private IP with its Elastic IP

**Lesson:**

* NAT enables outbound-only internet access
* Internet Gateway requires a public IP for direct communication
* Private instances never become reachable from the internet

---

### 3. ALB Not Routing Traffic

**Problem:**
Application Load Balancer returned “site cannot be reached”.

**Root Cause:**
Security group attached to ALB did not allow inbound HTTP (port 80).

**Resolution:**
Added inbound rule:

* HTTP (80) → 0.0.0.0/0

**Lesson:**
Even correctly configured infrastructure fails if security groups block traffic.
Networking issues are often caused by simple misconfigurations.

---

### 4. Broken User Data Script

**Problem:**
Auto Scaling instances were launching but application was not working.

**Root Cause:**
User Data script failed due to:

* missing `-y` flag in package installation
* later: missing `package.json`, causing `npm install` to fail

Because `set -e` was enabled, the script stopped execution on error.

**Resolution:**

* Fixed package installation command
* Added `package.json` and dependencies to repository

**Lesson:**
User Data must be:

* idempotent
* fully self-contained
* carefully validated via logs (`/var/log/cloud-init-output.log`)

---

### 5. CI/CD Permission Failure

**Problem:**
GitHub Actions failed with:
`AccessDenied: autoscaling:StartInstanceRefresh`

**Root Cause:**
IAM user used by CI/CD pipeline did not have sufficient permissions.

**Resolution:**
Added policy allowing:
`autoscaling:StartInstanceRefresh`

**Lesson:**
IAM errors are often misleading — even correct logic fails without explicit permissions.
Always verify identity-based policies when debugging AWS CLI failures.

---

### 6. Misuse of Launch Template Versioning

**Problem:**
Attempted to deploy application changes by creating new Launch Template versions.

**Root Cause:**
Incorrect assumption that infrastructure versioning is required for application updates.

**Resolution:**
Simplified pipeline:

* removed Launch Template versioning step
* used `start-instance-refresh` only

**Lesson:**
Clear separation is required between:

* infrastructure deployment
* application deployment

Not every change requires infrastructure updates.

---

### 7. Understanding Rolling Updates in Auto Scaling

**Problem:**
Observed additional instances during deployment (more than desired capacity).

**Root Cause:**
Misinterpretation of Auto Scaling behavior.

**Resolution:**
Learned that Instance Refresh:

* temporarily increases capacity
* replaces instances gradually

**Lesson:**
Auto Scaling prioritizes availability over simplicity.
Rolling updates ensure zero/minimal downtime.

---

### 8. Backend Integration and Data Flow

**Problem:**
Frontend could not directly interact with the database.

**Root Cause:**
Incorrect assumption that browser can access RDS.

**Resolution:**
Introduced Node.js backend:

* handles database communication
* exposes API endpoint (`/visit`)

**Lesson:**
Proper architecture requires separation:
Browser → Backend → Database
Direct DB exposure is both insecure and impractical.

---

### Summary

The main challenges were not related to service configuration alone, but to:

* understanding traffic flow in AWS networking
* handling ephemeral infrastructure
* designing proper deployment workflows
* debugging failures across multiple layers

These issues significantly improved understanding of real-world cloud system behavior.


## 5. Deployment Flow

The system uses an immutable deployment model.

Flow:

1. Developer pushes code to GitHub
2. GitHub Actions pipeline is triggered
3. Pipeline calls:
   aws autoscaling start-instance-refresh
4. Auto Scaling Group:
   - launches new EC2 instances
   - runs User Data (pulls latest code)
   - waits for health checks
   - terminates old instances

Key property:
Instances are never modified in place — they are replaced.

## 6. Failure Scenarios

### EC2 Instance Failure
Handled automatically by Auto Scaling Group.
Unhealthy instance is terminated and replaced.

### Availability Zone Failure
ALB continues routing to healthy instances in the remaining AZ.

Limitation:
Single NAT Gateway → private subnets in other AZ lose outbound internet.

### Database Failure
If RDS is unavailable:
- Backend cannot serve dynamic requests
- Application partially degrades

Mitigation (not implemented):
- Multi-AZ RDS deployment
- Read replicas

## 7. How to Deploy

1. Create VPC (10.0.0.0/16)
2. Create public/private subnets in 2 AZs
3. Attach Internet Gateway
4. Create NAT Gateway in public subnet
5. Configure route tables:
   - Public → IGW
   - Private → NAT
6. Create Security Groups:
   - ALB: allow 80 from 0.0.0.0/0
   - EC2: allow 80 from ALB SG
   - RDS: allow 5432 from EC2 SG
7. Create RDS (PostgreSQL)
8. Create Launch Template (with User Data)
9. Create Auto Scaling Group (private subnets)
10. Create ALB + Target Group
11. Configure GitHub Actions for deployment


## 8. Future Improvements

- Multi-AZ NAT Gateway (improved resilience)
- HTTPS (TLS termination on ALB)
- Secrets Manager instead of environment variables
- Artifact-based deployment (S3 instead of Git clone)
- Blue/Green deployment strategy
- CloudWatch alarms and alerting