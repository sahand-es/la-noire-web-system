# Web Programming Course Project
**Instructor:** Ali Ebrahimi  
**Project Designers:**  
- Mani Ebrahimi  
- Mehdi Jafari  

**Fall 2025 — Computer Engineering Department**

---

## Table of Contents

1. [Introduction](#introduction)  
   1.1 [Project Notes and Rules](#project-notes-and-rules)  
   1.2 [Evaluation Criteria](#evaluation-criteria)  
   1.3 [Checkpoints](#checkpoints)  
   - 1.3.1 [First Checkpoint](#first-checkpoint)  
   - 1.3.2 [Second Checkpoint](#second-checkpoint)  
   1.4 [Project Report](#project-report)  
   1.5 [Project Implementation Guide](#project-implementation-guide)

2. [Project Overview](#project-overview)  
   2.1 [Initial Description](#initial-description)  
   2.2 [User Levels](#user-levels)  
   2.3 [Project Technology Stack](#project-technology-stack)

3. [Project Details](#project-details)  
   3.1 [Police Ranks](#police-ranks)  
   3.2 [Crime Levels](#crime-levels)

4. [Processes](#processes)  
   4.1 [Registration and Login](#registration-and-login)  
   4.2 [Case Creation](#case-creation)  
   - 4.2.1 [Case Creation Through Complaint Registration](#case-creation-through-complaint-registration)  
   - 4.2.2 [Case Creation Through Crime Scene Registration](#case-creation-through-crime-scene-registration)  
   4.3 [Evidence Registration](#evidence-registration)  
   - 4.3.1 [Witness Testimonies or Local Residents](#witness-testimonies-or-local-residents)  
   - 4.3.2 [Found Evidence: Biological and Medical](#found-evidence-biological-and-medical)  
   - 4.3.3 [Found Evidence: Vehicles](#found-evidence-vehicles)  
   - 4.3.4 [Found Evidence: Identification Documents](#found-evidence-identification-documents)  
   - 4.3.5 [Found Evidence: Other Items](#found-evidence-other-items)  
   4.4 [Case Resolution](#case-resolution)  
   4.5 [Suspect Identification and Interrogation](#suspect-identification-and-interrogation)  
   4.6 [Trial](#trial)  
   4.7 [Suspect Status](#suspect-status)  
   4.8 [Reward](#reward)  
   4.9 [Bail and Fine Payment (Optional)](#bail-and-fine-payment-optional)

5. [Required Pages](#required-pages)  
   5.1 [Home Page](#home-page)  
   5.2 [Login and Registration Page](#login-and-registration-page)  
   5.3 [Modular Dashboard](#modular-dashboard)  
   5.4 [Detective Board](#detective-board)  
   5.5 [Intensive Pursuit](#intensive-pursuit)  
   5.6 [Case and Complaint Status](#case-and-complaint-status)  
   5.7 [General Reporting](#general-reporting)  
   5.8 [Document Registration and Review](#document-registration-and-review)

6. [First Checkpoint Delivery Review Items](#first-checkpoint-delivery-review-items)

7. [Second Checkpoint Delivery Review Items](#second-checkpoint-delivery-review-items)

8. [Related Resources](#related-resources)

---

# Chapter 1
## Introduction

### Project Notes and Rules
- Please read all pages of this document before starting the project.
- **Development Stack** for this project:
  - **Back-end:** Django REST Framework (DRF)
  - **Front-end:** React or NextJS  
  Use of other frameworks will not be accepted.
- The project is completed in groups of three and will be delivered in **2 checkpoints**.
- First Checkpoint: Back-end development with DRF
- Second Checkpoint: Front-end development with React or NextJS
- This document contains all necessary explanations for completing both checkpoints. Despite the guidance, **requirements analysis and decision-making** for building a **maintainable** system is your responsibility.
- The project requires a **final report** delivered in PDF or Wiki format (GitHub/GitLab).
- The report itself does not have a grade, but its existence is the main condition for earning the project grade (8 points).
- Use of artificial intelligence is permitted, but please pay attention to the report section of this chapter.

### Evaluation Criteria
For each checkpoint and final delivery, the following criteria are used to evaluate the project:
1. Meeting the requirements mentioned in the project document
2. Clean and maintainable code following principles discussed in class
3. Complete mastery of all members over the project code
4. Participation of all members

> Note: In the final delivery, a written general report of the project will also be collected.  
> Participation basis will be according to the number of commits in the project repository. A minimum of **15 commits** is required to earn the grade for each checkpoint. The project code repository (or repositories) must be public and accessible.

**Terms:**
- Development Stack
- Back-end
- Front-end
- Maintainable System
- Wiki
- GitHub
- GitLab
- Maintainable

### Checkpoints

#### First Checkpoint
In the first checkpoint, only the Back-end of the project will be collected. Each required endpoint must:
- Have proper error handling
- Have proper access management
- Follow REST principles and software engineering principles

#### Second Checkpoint
In the second checkpoint, the Front-end of the project (connected to Back-end) will be collected. There may be various reasons to need changes in the Back-end, and these changes are not obstacles and are encouraged.

> If you have earned at least 80% of the grade from the first checkpoint, you can deliver the remaining 20% in the second checkpoint.

### Project Report
It is recommended not to write the report at the end of the project; write it simultaneously with the project in GitHub/GitLab Wiki or write it in Obsidian (Markdown) and export to PDF.

The report must include the following:
- Responsibilities and work done by each member
- Development conventions (naming, commit message format, etc.)
- Project management approach (how tasks are created and divided)
- Key system entities along with the reason for their existence
- Maximum 6 NPM packages used along with summary of usage and justification
- Several code samples generated by artificial intelligence
- Strengths and weaknesses of artificial intelligence in Front-end development
- Strengths and weaknesses of artificial intelligence in Back-end development
- Initial and final project requirements analysis and analysis of strengths/weaknesses of decisions

> Non-compliance of the report with the project will be considered as non-delivery of the report.

### Project Implementation Guide
For the first checkpoint, it is recommended to start with designing entity models; the entire system infrastructure is built on these models and relationships.

- Endpoints must be built based on model design (not vice versa).
- Following REST principles, proper access management, appropriate error handling, and providing complete Swagger documentation are essential.
- The criterion for this phase: Back-end should be unambiguous, clean, testable, and ready to connect to Front-end.

In the second checkpoint, focus should be on precise, efficient, and modular user interface implementation:
- All pages should be according to requirements and logical from UI/UX perspective.
- Complex flows such as Detective Board, case status, intensive pursuit display, and admin panel should work without extra load on Back-end.
- Complete dockerization of the project, following engineering patterns in component construction, Front-end testing, and state management are important.

---

# Chapter 2
## Project Overview

### Initial Description
You have probably heard of the game **L.A. Noire** by Rockstar. In this game, you play the role of a detective solving criminal cases in Los Angeles. Since the game's story takes place in the early 1940s, almost all police department affairs are done manually and on paper.

Now in **2025**, the city police department has decided to automate its affairs and store data on machines. You are tasked with creating a web-based system for this department to meet the mentioned requirements. Also, in this document, the processes and access levels involved in them are discussed.

### User Levels
Basic user roles are generally divided into the following categories:
- System Administrator
- Police Chief
- Captain
- Sergeant
- Detective
- Police Officer / Patrol Officer
- Cadet
- Complainant / Witness
- Suspect / Criminal
- Judge
- Coroner
- Base user

> Without needing to change code, the system administrator must be able to add new roles or delete/change existing roles.

### Project Technology Stack
- **Front-end:** React or NextJS
- **Back-end:** Django REST Framework
- **Database (Recommended):** PostgreSQL

---

# Chapter 3
## Project Details

### Police Ranks

#### Cadet
Cadet is the lowest rank of police department employee. Their main duty is filtering and initial validation of received complaints and, if there are no issues, sending them to higher ranks for case creation.

#### Coroner
Responsible for reviewing and approving or rejecting biological and medical evidence.

#### Police Officer and Patrol Officer
Through field activities, they report any suspicious phenomena or crimes they encounter for case creation.

#### Detective
Searches for evidence and analyzes connections between them through reasoning. After analyzing the case, identifies suspects and reports them to the sergeant, and participates in interrogations.

#### Sergeant
The main collaborator and supervisor of the detective for solving cases. Issues arrest warrants and interrogation orders for suspects and determines and reports the probability of guilt.

#### Captain
Approves the case and sends it to the judiciary for trial.

#### Police Chief
In critical crimes, refers suspects to the judiciary for trial instead of the captain.

### Crime Levels

#### Level 3
Minor crimes such as petty theft and minor fraud.

#### Level 2
Larger crimes such as car theft.

#### Level 1
Major crimes such as murder.

#### Critical Level
Large-scale crimes such as serial murder or assassination of an important person.

---

# Chapter 4
## Processes

### Registration and Login
Each user initially creates an account with a regular user role by specifying at least the following:
- Username
- Password
- Email
- Phone number
- First and last name
- National ID

Then the system administrator assigns the required role(s) to the user.

Login is done with password and one of the following:
- Username
- National ID
- Phone number
- Email

> All items must be unique.

### Case Creation
A case starts when:
- A complainant files a complaint, or
- One of the police ranks (except cadet) observes a crime scene or receives a report and wants to register it.

#### Case Creation Through Complaint Registration
- The complainant enters the system and requests case creation and enters information.
- Information goes to the cadet for review.
- If complete and correct, it is sent to the police officer.
- If the police officer approves, the case is created.

Notes:
- If the cadet finds a deficiency, they return it to the complainant to correct.
- Returning the case to the complainant must have an error message that the cadet has entered.
- If the police officer finds a deficiency, the case does not return directly to the complainant and returns to the cadet for re-review.
- If the complainant enters incomplete/incorrect information 3 times, the case is voided and no longer goes to the police for review.
- A case may have multiple complainants; complainant information is approved/rejected by the cadet.

#### Case Creation Through Crime Scene Registration
- One of the police ranks except cadet observes a crime scene or witnesses report.
- Police records the time/hour in the case.
- Witness phone numbers and national IDs are recorded for follow-up.
- Only one superior rank must approve the case (if the police chief registers, approval is not needed).
- Initially there is no complainant, but complainants may be added over time.

### Evidence Registration
Evidence is divided into two categories. Important points:
- All evidence includes title and description.
- All evidence must have a registration date.
- All evidence has a recorder.

#### Witness Testimonies or Local Residents
On each case, witness testimony transcripts can be recorded. Also, local residents may have related images/videos/audio.

#### Found Evidence: Biological and Medical
For example, blood stains, hair strands, or fingerprints must be reviewed and approved by the coroner or identity database. Must be stored with title, description, and one/several images. The follow-up result is initially empty and may be filled later.

#### Found Evidence: Vehicles
Model, license plate, and color must be recorded. If there is no license plate, serial number is entered. License plate and serial cannot both have values simultaneously.

#### Found Evidence: Identification Documents
Document information is stored as key-value pairs. The number of key-value pairs is unlimited and may not even exist (e.g., only a name on the card).

#### Found Evidence: Other Items
Stored as a title-description record.

### Case Resolution
After creation, the case can be reviewed by the detective:
- The detective has a **Detective Board** where documents/evidence are placed.
- The detective can connect related documents with a red line.
- Then reports the main suspects to the sergeant and waits for approval.
- The sergeant reviews the documents and matches the detective's reasoning with suspect records.
- If in agreement, an approval message is sent and arrest begins; if in disagreement, sends a disagreement message and the case remains open.
- New documents can be added during case resolution, and for each one, a notification must reach the detective.

### Suspect Identification and Interrogation
After arrest:
- Sergeant and detective each determine the suspect's probability of guilt from 1 to 10.
- Scores go to the captain, and they determine the final opinion with statements, documents, and scores.
- In critical crimes, the police chief must also approve or reject the captain's opinion.

### Trial
The suspect must go to court. The judge must see the entire case along with evidence and documents and complete details of all involved individuals. Then the final verdict (innocent/guilty) and punishment are recorded.

### Suspect Status
From the time a person is identified as a suspect, they are under pursuit. If under pursuit for more than one month, they enter **Intensive Pursuit** status and their photo and details are placed on a page that all users can see.

**Note 1: Intensive Pursuit Page Ranking**
max(Lj) · max(Di)
- `Lj`: Maximum days a crime in an open case has been under pursuit
- `Di`: Maximum crime degree (1 to 4 for level 3 to critical)

Below each person's information, a reward for information about them must be recorded, calculated from the following formula (Rials):
max(Lj) · max(Di) · 20,000,000

### Reward
- A regular user enters the system and registers information about a case or suspect.
- Police officer does initial review: if invalid, it is rejected; if valid, it is sent to the detective responsible for the case.
- If the detective approves, the user is notified and given a unique identifier (Unique ID) to present to the police department to receive the reward.
- All police ranks must be able to see the reward amount and related information by entering **person's national ID + unique code**.

### Bail and Fine Payment (Optional)
Suspects of level 2 and 3 crimes can be released by paying bail/fine (with sergeant approval for level 3). The amount is determined by the sergeant, and the system must be connected to a payment gateway.

---

# Chapter 5
## Required Pages

### Home Page
- General introduction of the system along with the police department and their duties
- Display at least 3 statistics from cases and status:
  - Total number of solved cases
  - Total number of organization employees
  - Number of active cases

### Login and Registration Page
Dedicated page for user login and registration.

### Modular Dashboard
Display an appropriate dashboard for each user account. The dashboard must be modular and show modules based on access level.  
Example: Detective sees the "Detective Board" module, coroner should not see such a module.

### Detective Board
- Includes documents/notes
- Ability to connect documents with red lines
- Drag-and-Drop for movement
- Ability to delete/add lines between documents
- Ability to Export to image for attaching to reports

### Intensive Pursuit
Display criminals/suspects under intensive pursuit with details.

### Case and Complaint Status
Each user, based on access level and rules, sees relevant cases/complaints and can edit if possible.

### General Reporting
For judge, captain, and police chief:
- General report of each case including: creation date, evidence, testimonies, suspects (if any), criminal, complainant/complainants, name and rank of all involved individuals

### Document Registration and Review
Based on processes, provide the ability to register and review documents for each user and access level.

---

# Chapter 6
## First Checkpoint Delivery Review Items

The first checkpoint includes the Back-end of the project and consists of **4750 points**.

> Reminder: The condition for earning the project grade is the existence of a final report, and its absence causes loss of the entire project grade (8 points) + 1.5 points.  
> Back-end must have Swagger documentation.

### Checklist
- Reasonable and precise design of entity models according to requirements (750)
- Existence of appropriate endpoints to meet requirements (1000)
- Existence of required CRUD APIs, no more no less (250)
- Following REST principles (100)
- Access level checking and appropriate response in each API Call (250)
- Implementation of appropriate endpoints for processes (400)
- Implementation of Role-Based Access Control (RBAC) (200)
- Role flexibility (create/delete/change role without code change) (150)
- Creating efficient and appropriate endpoints for processes (1100)
- Registration and login (100)
- Case creation (100)
- Evidence registration (100)
- Case resolution (200)  
  > It is expected that you have a design for the Detective board so that in the second checkpoint there is minimal need to change Back-end.
- Suspect identification and interrogation (100)
- Trial (100)
- Suspect status (100)
- Reward (100)
- Payment (200)  
  > Connection to payment gateway is important.
- Endpoint for aggregated and general statistics (200)
- Correct implementation of suspect and criminal ranking (300)
- Existence of payment gateway return page (100)  
  > It is recommended not to use Django Templates.
- Dockerizing Back-end and services (200)
- Completeness and reliability of Swagger (request/response examples + complete descriptions) (250)
- Minimum 5 tests in 2 different apps (total minimum 10 tests) (100)
- Code cleanliness and following mentioned best practices (100)
- Breaking Back-end into a reasonable number of apps (100)
- Using Django/DRF features and avoiding boilerplate as much as possible (100)
- Ease of code change (add/change feature) (100)

---

# Chapter 7
## Second Checkpoint Delivery Review Items

In the second checkpoint, the Front-end of the project is reviewed. Naturally, you have the right to modify the Back-end code (in pursuit of creating better infrastructure for Front-end implementation). However, try to use the first checkpoint Back-end as much as possible. Again, in this phase, code cleanliness and technical details are important, and poor code quality will not be overlooked in any way.

> At the end of the second checkpoint, uploading the final project report is mandatory, otherwise the entire project grade will be lost and no excuses will be accepted.

### Checklist
- Appropriate page implementation (appropriate UI/UX and precise functionality according to requirements) (3000)
- Home page (200)
- Login and registration page (200)
- Modular dashboard (800)
- Detective board (800)
- Intensive pursuit (300)
- Case and complaint status (200)
- General reporting (300)
- Document registration and review (200)
- Admin panel (non-Django but with similar functionality) (200)
- Display Loading state and Skeleton Layout (300)
- Dockerizing entire project and using Docker Compose (300)
- Minimum 5 tests in Front-end (100)
- Appropriate state management (100)
- Responsive pages (300)
- Following best practices mentioned in class and in slides (150)
- Following appropriate lifecycle for components (100)
- Display appropriate error messages for conditions (100)
- Ease of code flexibility (100)

---

# Chapter 8
## Related Resources

### 8.1 Design and Implementation of Responsive Pages
- Media Queries Documentation — MDN
- Responsive Design Guide — Web.dev
- Flexbox Guide — CSS Tricks
- Dribbble

### 8.2 Implementation of Access Levels in Django
- RBAC Concept
- Simple Example of RBAC Implementation in Django
- Permissions Documentation — Django
- Authentication and Access Control — Django
- Permissions in DRF

### 8.3 Back-end Testing
- Unit Test Documentation in Python
- Pytest Guide
- Django Testing Tutorial
- DRF Tests

### 8.4 Front-end Testing
- React Testing Library
- Jest
- Playwright

### 8.5 Design and Creation of Pipeline
- GitLab CI/CD Pipelines
- GitHub Actions Documentation
- Docker with CI/CD

### 8.6 CI/CD
- Continuous Integration — Atlassian
- Continuous Delivery — ThoughtWorks

### 8.7 Test Payment Gateways
- Zarinpal
- IDPay
- BitPay

