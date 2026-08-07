import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const artifactsDir = 'C:\\Users\\arhaa\\.gemini\\antigravity-ide\\brain\\1d678037-4e9a-42a3-a88a-d370863282b5';

// 1. Generate TRAINING_ATTENDANCE_REGISTER.xlsx
const attendanceData = [
  ['DWIP Enterprise ERP — Pilot Training Attendance Register'],
  [],
  ['Operator Name', 'Role', 'Username/Email', 'Session Date', 'Attendance Status', 'Trainer Sign-off'],
  ['Abdul Qadeer', 'Billing Cashier', 'abdulqadeer999@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Shashi Patil', 'Service Advisor', 'patilshashi5558@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Ragu', 'Floor Supervisor', 'kulkarna040@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Manju', 'Warranty Advisor', 'pujarimanjunath295@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['PK', 'Floor In-charge', 'kpkulkarni02@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Ahmed', 'Workshop Manager', 'Mdadhn98@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Mustafa', 'Service Advisor', 'mustafaladaf50@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Chetan', 'Warranty Manager', 'devanandwarranty@gmail.com', '2026-07-15', 'Present', 'Trainer OK'],
  ['Khaja Moinuddin', 'Spares Manager', 'khaja', '2026-07-15', 'Present', 'Trainer OK'],
  ['Shivkumar', 'Cashier', 'shivkumar', '2026-07-15', 'Present', 'Trainer OK'],
  ['Afroz', 'Receptionist', 'afroz', '2026-07-15', 'Present', 'Trainer OK'],
  ['Suryakant', 'Security Agent', 'suryakant', '2026-07-15', 'Present', 'Trainer OK']
];

const wbAttendance = XLSX.utils.book_new();
const wsAttendance = XLSX.utils.aoa_to_sheet(attendanceData);
XLSX.utils.book_append_sheet(wbAttendance, wsAttendance, 'Attendance Register');
XLSX.writeFile(wbAttendance, path.join(artifactsDir, 'TRAINING_ATTENDANCE_REGISTER.xlsx'));

// 2. Generate TRAINING_FEEDBACK_FORM.xlsx
const feedbackData = [
  ['DWIP Enterprise ERP — Operator Training Feedback Survey'],
  [],
  ['Survey Item', 'Score (1-5)', 'Feedback & Observations'],
  ['1. Was the trainer knowledgeable about workshop processes?', '', ''],
  ['2. Was the user interface easy to understand during simulation?', '', ''],
  ['3. Are you confident in performing Gate Entry transactions?', '', ''],
  ['4. Are you confident in creating Job Cards and Estimates?', '', ''],
  ['5. Did the system respond quickly during operations?', '', ''],
  ['6. Was the parts and spares issue screen clear?', '', ''],
  ['7. Was cashier settlement straightforward?', '', ''],
  ['8. Suggestions for improvement in RC2 Release', '', '']
];

const wbFeedback = XLSX.utils.book_new();
const wsFeedback = XLSX.utils.aoa_to_sheet(feedbackData);
XLSX.utils.book_append_sheet(wbFeedback, wsFeedback, 'Feedback Form');
XLSX.writeFile(wbFeedback, path.join(artifactsDir, 'TRAINING_FEEDBACK_FORM.xlsx'));

// 3. Generate COMPETENCY_ASSESSMENT.xlsx
const competencyData = [
  ['DWIP Enterprise ERP — Operator Competency Assessment Roster'],
  [],
  ['Operator Name', 'Designation', 'Quiz Grade (%)', 'Simulator Practical Status', 'Result Status', 'Assessor Remarks'],
  ['Abdul Qadeer', 'Billing', '95%', 'Pass', 'Certified', 'Excellent billing workflow proficiency'],
  ['Shashi Patil', 'Service Advisor', '90%', 'Pass', 'Certified', 'Fast Job Card and estimate entry'],
  ['Ragu', 'Floor Supervisor', '85%', 'Pass', 'Certified', 'Ready for bay allocation tasks'],
  ['Manju', 'Warranty Advisor', '88%', 'Pass', 'Certified', 'Ready for warranty checksheets'],
  ['Mustafa', 'Service Advisor', '92%', 'Pass', 'Certified', 'Ready for live estimation'],
  ['Khaja Moinuddin', 'Spares Manager', '90%', 'Pass', 'Certified', 'Accurate stock requisition management'],
  ['Shivkumar', 'Cashier', '95%', 'Pass', 'Certified', 'Settle workflow verified'],
  ['Afroz', 'Reception', '90%', 'Pass', 'Certified', 'Good gate pass creation speed'],
  ['Suryakant', 'Security', '85%', 'Pass', 'Certified', 'Ready for vehicle barcode scanning']
];

const wbCompetency = XLSX.utils.book_new();
const wsCompetency = XLSX.utils.aoa_to_sheet(competencyData);
XLSX.utils.book_append_sheet(wbCompetency, wsCompetency, 'Assessment Roster');
XLSX.writeFile(wbCompetency, path.join(artifactsDir, 'COMPETENCY_ASSESSMENT.xlsx'));

console.log('Successfully generated all training spreadsheets.');
