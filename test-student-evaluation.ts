import { chromium, Browser, Page, Dialog } from 'playwright';

/**
 * Automated Student Evaluation Testing Script
 * 
 * This script automatically:
 * 1. Logs in as students from the database
 * 2. Navigates to subjects page
 * 3. Evaluates all unevaluated subjects with random ratings
 * 
 * Usage:
 *   npm run test:evaluate                              # Test all students (browsers visible)
 *   npm run test:evaluate -- --headless                # Test all students (headless)
 *   npm run test:evaluate -- --student 21-1234-567     # Test specific student
 *   npm run test:evaluate -- --url http://localhost:5000 --headless
 */

interface EvaluationConfig {
  studentNumber: string;
  baseUrl: string;
  headless: boolean;
  slowMo: number;
}

class StudentEvaluationAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: EvaluationConfig;

  constructor(config: Partial<EvaluationConfig> = {}) {
    this.config = {
      studentNumber: config.studentNumber || '21-1234-567',
      baseUrl: config.baseUrl || 'http://localhost:3000',
      headless: config.headless !== undefined ? config.headless : false,
      slowMo: config.slowMo || 100
    };
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    console.log('🚀 Starting browser automation...\n');
    
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo
    });

    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });

    this.page = await context.newPage();
  }

  /**
   * Login as student
   */
  async login(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`📝 Logging in as student: ${this.config.studentNumber}`);
    
    try {
      await this.page.goto(`${this.config.baseUrl}/student/login`);
      await this.page.waitForLoadState('networkidle');

      // Fill in student number
      await this.page.fill('input[type="text"]', this.config.studentNumber);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForURL(`${this.config.baseUrl}/student/subjects`, { timeout: 5000 });
      
      console.log('✓ Successfully logged in\n');
      return true;
    } catch (error) {
      console.error('✗ Login failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Get list of unevaluated subjects
   */
  async getUnevaluatedSubjects(): Promise<Array<{ enrollmentId: string; courseName: string; teacherName: string }>> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('📚 Fetching unevaluated subjects...');

    await this.page.waitForSelector('.bg-white.rounded-lg.shadow-md', { timeout: 5000 });

    // Get all evaluation buttons
    const subjects = await this.page.$$eval('a[href*="/student/evaluate/"]', (links) => {
      return links.map((link) => {
        const href = link.getAttribute('href') || '';
        const enrollmentId = href.split('/').pop() || '';
        
        // Find parent card
        const card = link.closest('.bg-white.rounded-lg.shadow-md');
        const courseName = card?.querySelector('h3')?.textContent?.trim() || 'Unknown Course';
        const teacherName = card?.querySelector('.text-gray-600')?.textContent?.replace('Teacher:', '').trim() || 'Unknown Teacher';

        return { enrollmentId, courseName, teacherName };
      });
    });

    console.log(`✓ Found ${subjects.length} unevaluated subjects\n`);
    return subjects;
  }

  /**
   * Generate random rating (1-5)
   */
  private getRandomRating(): string {
    const ratings = ['5', '4', '3', '2', '1'];
    // Bias towards higher ratings (more realistic)
    const weights = [0.4, 0.3, 0.2, 0.08, 0.02];
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < ratings.length; i++) {
      sum += weights[i];
      if (random <= sum) return ratings[i];
    }
    
    return '4'; // Default to "High Satisfactory"
  }

  /**
   * Generate random comment (optional)
   */
  private getRandomComment(): string {
    const comments = [
      'Great teacher! Very knowledgeable and helpful.',
      'Effective teaching methods and clear explanations.',
      'Engaging lectures and fair grading.',
      'Approachable and always willing to help students.',
      'Well-organized class and good use of examples.',
      '', // Some students don't leave comments
      '',
      ''
    ];
    
    return comments[Math.floor(Math.random() * comments.length)];
  }

  /**
   * Fill evaluation form with random ratings
   */
  async fillEvaluationForm(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('  📝 Filling evaluation form...');

    // Wait for the form to load
    await this.page.waitForSelector('form', { timeout: 5000 });

    // Get all radio buttons
    const ratingFields = await this.page.$$('input[type="radio"]');
    const fieldNames = new Set<string>();

    // Collect unique field names
    for (const field of ratingFields) {
      const name = await field.getAttribute('name');
      if (name) fieldNames.add(name);
    }

    console.log(`  ✓ Found ${fieldNames.size} rating questions`);

    // Fill each rating field
    for (const fieldName of fieldNames) {
      const rating = this.getRandomRating();
      await this.page.check(`input[name="${fieldName}"][value="${rating}"]`);
    }

    // Fill comments (optional)
    const comment = this.getRandomComment();
    if (comment) {
      await this.page.fill('textarea[name="comments"]', comment);
      console.log(`  ✓ Added comment: "${comment.substring(0, 50)}..."`);
    }

    console.log('  ✓ Form filled successfully');
  }

  /**
   * Submit evaluation
   */
  async submitEvaluation(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    try {
      // Click submit button
      await this.page.click('button[type="submit"]');

      // Handle confirmation dialog
      this.page.on('dialog', async (dialog: Dialog) => {
        console.log(`  ⚠️  Confirmation dialog: ${dialog.message()}`);
        await dialog.accept();
      });

      // Wait for success modal or redirect
      try {
        await this.page.waitForSelector('.modal, .success', { timeout: 3000 });
        console.log('  ✓ Evaluation submitted successfully!\n');
      } catch {
        // Sometimes it redirects directly
        await this.page.waitForURL(`${this.config.baseUrl}/student/subjects`, { timeout: 5000 });
        console.log('  ✓ Evaluation submitted successfully!\n');
      }

      return true;
    } catch (error) {
      console.error('  ✗ Submission failed:', (error as Error).message);
      return false;
    }
  }

  /**
   * Evaluate a single subject
   */
  async evaluateSubject(enrollmentId: string, courseName: string, teacherName: string): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`📊 Evaluating: ${courseName}`);
    console.log(`   Teacher: ${teacherName}`);
    console.log(`   Enrollment ID: ${enrollmentId}`);

    try {
      // Navigate to evaluation page
      await this.page.goto(`${this.config.baseUrl}/student/evaluate/${enrollmentId}`);
      await this.page.waitForLoadState('networkidle');

      // Fill and submit form
      await this.fillEvaluationForm();
      await this.submitEvaluation();

      return true;
    } catch (error) {
      console.error(`✗ Failed to evaluate ${courseName}:`, (error as Error).message);
      return false;
    }
  }

  /**
   * Run full automation
   */
  async run(): Promise<void> {
    try {
      await this.initialize();

      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      const subjects = await this.getUnevaluatedSubjects();

      if (subjects.length === 0) {
        console.log('✓ No subjects to evaluate. All done!\n');
        return;
      }

      console.log(`🎯 Starting evaluation of ${subjects.length} subjects...\n`);

      let successCount = 0;
      let failCount = 0;

      for (const subject of subjects) {
        const success = await this.evaluateSubject(
          subject.enrollmentId,
          subject.courseName,
          subject.teacherName
        );

        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // Small delay between evaluations
        await this.page!.waitForTimeout(1000);
      }

      console.log('='.repeat(60));
      console.log('EVALUATION AUTOMATION COMPLETE');
      console.log('='.repeat(60));
      console.log(`✓ Successfully evaluated: ${successCount} subjects`);
      if (failCount > 0) {
        console.log(`✗ Failed to evaluate: ${failCount} subjects`);
      }
      console.log('='.repeat(60) + '\n');

    } catch (error) {
      console.error('❌ Automation error:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
    console.log('✓ Browser closed\n');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<EvaluationConfig> {
  const args = process.argv.slice(2);
  const config: Partial<EvaluationConfig> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--student' && args[i + 1]) {
      config.studentNumber = args[i + 1];
      i++;
    } else if (args[i] === '--url' && args[i + 1]) {
      config.baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--headless') {
      config.headless = true;
    } else if (args[i] === '--slow' && args[i + 1]) {
      config.slowMo = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return config;
}

/**
 * Default students from database setup
 * These students are created by setup-db-mongodb.ts
 */
const DEFAULT_STUDENTS = [
  { number: '21-1234-567', name: 'Juan Dela Cruz' },
  { number: '21-1234-568', name: 'Maria Garcia' },
  { number: '21-5678-901', name: 'Pedro Santos' }
];

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   STUDENT EVALUATION AUTOMATION SCRIPT                   ║');
  console.log('║   Automated Testing for CCS Faculty Evaluation System    ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const config = parseArgs();
  
  // If no specific student is provided, test all default students
  if (!config.studentNumber) {
    console.log('Configuration:');
    console.log(`  Testing Mode: ALL STUDENTS (${DEFAULT_STUDENTS.length} students)`);
    console.log(`  Base URL: ${config.baseUrl || 'http://localhost:3000 (default)'}`);
    console.log(`  Headless: ${config.headless !== undefined ? config.headless : false}`);
    console.log(`  Slow Motion: ${config.slowMo || 100}ms\n`);
    
    console.log('Students to test:');
    DEFAULT_STUDENTS.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (${student.number})`);
    });
    console.log('');

    let totalSuccess = 0;
    let totalFail = 0;

    for (let i = 0; i < DEFAULT_STUDENTS.length; i++) {
      const student = DEFAULT_STUDENTS[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`[${i + 1}/${DEFAULT_STUDENTS.length}] Testing: ${student.name} (${student.number})`);
      console.log('='.repeat(60) + '\n');

      const studentConfig = {
        ...config,
        studentNumber: student.number,
        headless: config.headless !== undefined ? config.headless : false
      };

      const automation = new StudentEvaluationAutomation(studentConfig);

      try {
        await automation.run();
        console.log(`✓ Successfully completed evaluations for ${student.name}\n`);
        totalSuccess++;
      } catch (error) {
        console.error(`✗ Failed to complete evaluations for ${student.name}:`, error);
        totalFail++;
      }

      // Delay between students
      if (i < DEFAULT_STUDENTS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('BATCH AUTOMATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✓ Successful: ${totalSuccess} students`);
    if (totalFail > 0) {
      console.log(`✗ Failed: ${totalFail} students`);
    }
    console.log('='.repeat(60) + '\n');

    if (totalFail === 0) {
      console.log('✅ All automation tests completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  Some automation tests failed!');
      process.exit(1);
    }
  } else {
    // Single student mode
    console.log('Configuration:');
    console.log(`  Testing Mode: SINGLE STUDENT`);
    console.log(`  Student Number: ${config.studentNumber}`);
    console.log(`  Base URL: ${config.baseUrl || 'http://localhost:3000 (default)'}`);
    console.log(`  Headless: ${config.headless || false}`);
    console.log(`  Slow Motion: ${config.slowMo || 100}ms\n`);

    const automation = new StudentEvaluationAutomation(config);

    try {
      await automation.run();
      console.log('✅ Automation completed successfully!');
      process.exit(0);
    } catch (error) {
      console.error('❌ Automation failed:', error);
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { StudentEvaluationAutomation };
