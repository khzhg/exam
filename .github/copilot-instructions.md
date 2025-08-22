# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is an online exam system project with the following structure:

## Project Architecture
- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vue.js + Element UI
- **Database**: SQLite for simplicity and ease of deployment

## Key Features
1. **Student Functions**:
   - Online exams with timer
   - Practice mode with random questions
   - View personal wrong questions
   - Check exam scores and history

2. **Admin Functions**:
   - Question bank management (single choice, multiple choice, true/false, essay)
   - Excel batch import of questions
   - Paper composition from question bank
   - Student score management and statistics
   - Real-time exam monitoring

3. **Question Types**:
   - Single choice (单选)
   - Multiple choice (多选)
   - True/False (判断)
   - Essay (简答)

## Code Guidelines
- Use ES6+ features
- Follow REST API conventions
- Implement proper error handling
- Use async/await for asynchronous operations
- Validate all inputs
- Use descriptive variable and function names in Chinese comments where appropriate

## Database Schema
- Users table for students and admins
- Questions table for question bank
- Papers table for exam papers
- Exam_records table for exam sessions
- Answer_records table for individual answers
- Wrong_questions table for tracking mistakes

## Security Considerations
- Input validation and sanitization
- Basic authentication for admin/student roles
- SQL injection prevention
- File upload security for Excel imports
