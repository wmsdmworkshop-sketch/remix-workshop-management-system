import * as fs from 'fs';
import * as path from 'path';

const artifactsDir = 'C:\\Users\\arhaa\\.gemini\antigravity-ide\\brain\\1d678037-4e9a-42a3-a88a-d370863282b5';
const trainingDir = path.join(artifactsDir, 'TRAINING');

if (!fs.existsSync(trainingDir)) {
  fs.mkdirSync(trainingDir, { recursive: true });
}

const roles = ['DealerPrincipal', 'GMService', 'WorkshopManager', 'ServiceAdvisor'];

const dummySlideContent = (role: string) => `# DWIP Enterprise ERP — ${role} Training Presentation Slides
- 16:9 Presentation Format
- Slide 1: Welcome & Course Objectives
- Slide 2: Core Responsibilities & Dashboard Views
- Slide 3: Operations & Key Transactions
- Slide 4: Verification Checklists & KPIs
- Slide 5: Troubleshooting & Escalation Matrix
- Slide 6: Summary & Roster Signoff

*Speaker Notes:* Introduce the system, highlight the security updates (bcrypt passwords, CSP headers), and emphasize the daily workflows.`;

const dummyManualContent = (role: string) => `# DWIP Enterprise ERP — ${role} Operational Training Manual
- Role Specific Step-by-Step Training Guide
- 1. User Interface Navigation Map
- 2. Field Descriptions & Required Marks
- 3. Business Rule Matrix
- 4. Common Operator Mistakes
- 5. Frequently Asked Questions (FAQ)
- 6. Basic Troubleshooting

*Screenshots Referenced:*
- Dashboard: file:///C:/Users/arhaa/.gemini/antigravity-ide/brain/1d678037-4e9a-42a3-a88a-d370863282b5/Dashboard.png
- Master Data Panel: file:///C:/Users/arhaa/.gemini/antigravity-ide/brain/1d678037-4e9a-42a3-a88a-d370863282b5/master_data_hub_initial_1784109286938.png`;

const dummyQRCContent = (role: string) => `# DWIP Enterprise ERP — ${role} Quick Reference Card
- Single-page workflow reference cheat-sheet.
- **Access URL:** http://localhost:3001
- **Critical Hotkeys:** Ctrl + S (Save), Esc (Cancel)
- **Status Codes:** ARRIVED -> OPEN -> DRAFT -> APPROVED -> ASSIGNED -> IN_PROGRESS -> QC_PASSED -> SETTLED -> DELIVERED
- **Escalation Hotline:** Ext 101 (Supervisor), Ext 505 (IT Command Center)`;

const dummyChecklistContent = (role: string) => `# DWIP Enterprise ERP — ${role} Daily Checklist
- **Morning Checklist:** Device check, Login test, Briefing.
- **Transaction Checklist:** Perform live transactions, check status columns.
- **Verification Checklist:** Spot-check estimate values, reconcile logs.
- **End of Day Checklist:** Pause technician timers, log out, clean terminal.
- **Supervisor Sign-off:** Sign-off sheets completed.`;

const dummyQuizContent = (role: string) => `# DWIP Enterprise ERP — ${role} Assessment Quiz
- 20 Role-Specific Multiple Choice Questions
- Passing Score: 80% (16/20)
- Questions cover: JWT timeout recovery, bcrypt login, correct status workflow transitions, estimate validations.
- **Assessor Remarks:** To be entered in COMPETENCY_ASSESSMENT.xlsx.`;

const dummyTrainerGuideContent = (role: string) => `# DWIP Enterprise ERP — ${role} Trainer Guide
- **Course Duration:** 3 Hours
- **Agenda:** Interactive slide walkthrough, Simulator exercises, Quiz grading.
- **Evaluation Criteria:** Accuracy of data entry, correct status transitions, transaction execution speed.`;

for (const r of roles) {
  const roleFolder = path.join(trainingDir, r);
  if (!fs.existsSync(roleFolder)) {
    fs.mkdirSync(roleFolder, { recursive: true });
  }
  
  fs.writeFileSync(path.join(roleFolder, `${r}_Slides.md`), dummySlideContent(r));
  fs.writeFileSync(path.join(roleFolder, `${r}_Manual.md`), dummyManualContent(r));
  fs.writeFileSync(path.join(roleFolder, `${r}_QRC.md`), dummyQRCContent(r));
  fs.writeFileSync(path.join(roleFolder, `${r}_Checklist.md`), dummyChecklistContent(r));
  fs.writeFileSync(path.join(roleFolder, `${r}_Quiz.md`), dummyQuizContent(r));
  fs.writeFileSync(path.join(roleFolder, `${r}_TrainerGuide.md`), dummyTrainerGuideContent(r));
}

console.log('Successfully created all training directories and file templates.');
