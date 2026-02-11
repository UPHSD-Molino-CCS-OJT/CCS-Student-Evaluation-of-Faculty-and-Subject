import { chromium, Browser, Page, Dialog } from 'playwright';

/**
 * Automated Student Evaluation Testing Script
 * 
 * This script automatically:
 * 1. Logs in as students from the database
 * 2. Navigates to subjects page
 * 3. Evaluates all unevaluated subjects with random ratings
 * 
 * Updated to handle Skeleton loading states throughout the application.
 * The script now properly waits for skeleton loaders to disappear before
 * interacting with actual content.
 * 
 * Now supports dynamic student fetching from the database API.
 * 
 * Usage:
 *   npm run test:evaluate                              # Test all students from database (browsers visible)
 *   npm run test:evaluate -- --headless                # Test all students (headless)
 *   npm run test:evaluate -- --limit 10                # Test only first 10 students
 *   npm run test:evaluate -- --student 21-1234-567     # Test specific student
 *   npm run test:evaluate -- --url http://localhost:5000 --headless --limit 5
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
      await this.page.waitForLoadState('domcontentloaded');

      // Wait for login form to be visible
      await this.page.waitForSelector('input[type="text"]', { state: 'visible', timeout: 5000 });
      
      // Fill in student number
      await this.page.fill('input[type="text"]', this.config.studentNumber);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation with longer timeout
      await this.page.waitForURL(`${this.config.baseUrl}/student/subjects`, { timeout: 10000 });
      
      console.log('✓ Successfully logged in\n');
      return true;
    } catch (error) {
      console.error('✗ Login failed:', (error as Error).message);
      
      // Take screenshot on login failure
      try {
        const timestamp = new Date().getTime();
        await this.page.screenshot({ path: `login-error-${timestamp}.png`, fullPage: true });
        console.error(`  📸 Screenshot saved: login-error-${timestamp}.png`);
      } catch {
        // Ignore screenshot errors
      }
      
      return false;
    }
  }

  /**
   * Get list of unevaluated subjects
   */
  async getUnevaluatedSubjects(): Promise<Array<{ enrollmentId: string; courseName: string; teacherName: string }>> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('📚 Fetching unevaluated subjects...');

    try {
      // Wait for skeleton loaders to disappear and actual content to load
      await this.page.waitForSelector('.animate-pulse', { timeout: 5000 }).catch(() => {
        // Skeleton might already be gone, continue
      });
      
      // Wait for actual subject cards (not skeleton loaders)
      await this.page.waitForSelector('.bg-white.rounded-lg.shadow-md:not(.animate-pulse)', { timeout: 10000 });
      
      // Additional wait for evaluate buttons to ensure content is fully loaded
      await this.page.waitForSelector('a[href*="/student/evaluate/"]', { timeout: 5000 });

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
    } catch (error) {
      console.error('✗ Error fetching subjects:', (error as Error).message);
      
      // Take screenshot to help debug
      try {
        const timestamp = new Date().getTime();
        await this.page.screenshot({ path: `subjects-error-${timestamp}.png`, fullPage: true });
        console.error(`  📸 Screenshot saved: subjects-error-${timestamp}.png`);
      } catch {
        // Ignore screenshot errors
      }
      
      throw new Error(`Failed to fetch unevaluated subjects: ${(error as Error).message}`);
    }
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

    // Wait for skeleton loaders to disappear
    await this.page.waitForSelector('.animate-pulse', { timeout: 5000 }).catch(() => {
      // Skeleton might already be gone, continue
    });
    
    // Wait for the actual form to load (not skeleton)
    await this.page.waitForSelector('form:not(.animate-pulse)', { timeout: 10000 });
    
    // Wait for radio buttons to be interactive
    await this.page.waitForSelector('input[type="radio"]:not([disabled])', { timeout: 5000 });

    // Get all radio buttons (all sections are now always visible)
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
      
      // Click the label that contains the radio input (inputs are hidden with sr-only class)
      const selector = `label:has(input[name="${fieldName}"][value="${rating}"])`;
      const label = this.page.locator(selector).first();
      await label.scrollIntoViewIfNeeded();
      await label.click();
      
      // Wait for the input to be checked
      await this.page.waitForSelector(`input[name="${fieldName}"][value="${rating}"]:checked`, { timeout: 1000 });
    }

    // Fill comments (optional)
    const comment = this.getRandomComment();
    if (comment) {
      await this.page.locator('textarea[name="comments"]').scrollIntoViewIfNeeded();
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
      // Set up dialog handler BEFORE clicking submit
      const dialogPromise = new Promise<void>((resolve) => {
        this.page!.once('dialog', async (dialog: Dialog) => {
          console.log(`  ⚠️  Confirmation dialog: ${dialog.message()}`);
          await dialog.accept();
          resolve();
        });
      });

      // Scroll to submit button and click
      const submitButton = this.page.locator('button[type="submit"]').first();
      await submitButton.scrollIntoViewIfNeeded();
      await submitButton.click();

      // Wait for dialog to be handled
      await dialogPromise;
      console.log('  ✓ Confirmation accepted');

      // Wait for success modal or redirect
      try {
        await this.page.waitForSelector('.modal, .success', { timeout: 5000 });
        console.log('  ✓ Evaluation submitted successfully!\n');
        // Wait for navigation back to subjects page
        await this.page.waitForURL(`${this.config.baseUrl}/student/subjects`, { timeout: 5000 });
      } catch {
        // Sometimes it redirects directly without modal
        await this.page.waitForURL(`${this.config.baseUrl}/student/subjects`, { timeout: 8000 });
        console.log('  ✓ Evaluation submitted successfully!\n');
      }

      return true;
    } catch (error) {
      console.error('  ✗ Submission failed:', (error as Error).message);
      
      // Take screenshot on failure for debugging
      try {
        const timestamp = new Date().getTime();
        await this.page!.screenshot({ path: `error-${timestamp}.png`, fullPage: true });
        console.error(`  📸 Screenshot saved: error-${timestamp}.png`);
      } catch (screenshotError) {
        // Ignore screenshot errors
      }
      
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
      await this.page.waitForLoadState('domcontentloaded');
      
      // Check if already evaluated (error message)
      const alreadyEvaluatedError = await this.page.$('text=You have already evaluated this subject');
      if (alreadyEvaluatedError) {
        console.log('  ⚠️  Subject already evaluated - skipping');
        return true; // Return true to continue with other subjects
      }

      // Wait for skeleton loaders to finish
      console.log('  ⏳ Waiting for page to load...');
      await this.page.waitForSelector('.animate-pulse', { timeout: 3000 }).catch(() => {
        // Skeleton might load very quickly or not at all
      });
      
      // Wait for skeleton to disappear and form to be visible
      await this.page.waitForSelector('form:not(.animate-pulse)', { state: 'visible', timeout: 10000 });
      
      // Additional check that form fields are interactive
      await this.page.waitForSelector('input[type="radio"]', { state: 'visible', timeout: 5000 });
      console.log('  ✓ Evaluation form loaded');

      // Fill and submit form
      await this.fillEvaluationForm();
      const success = await this.submitEvaluation();
      
      if (!success) {
        throw new Error('Failed to submit evaluation');
      }

      return true;
    } catch (error) {
      console.error(`✗ Failed to evaluate ${courseName}:`, (error as Error).message);
      
      // Take screenshot on failure
      try {
        const timestamp = new Date().getTime();
        const filename = `error-${courseName.replace(/[^a-z0-9]/gi, '_')}-${timestamp}.png`;
        await this.page.screenshot({ path: filename, fullPage: true });
        console.error(`  📸 Screenshot saved: ${filename}`);
      } catch {
        // Ignore screenshot errors
      }
      
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

      // Wait for skeleton loaders to finish after login
      console.log('⏳ Waiting for subjects page to load...');
      await this.page!.waitForSelector('.animate-pulse', { timeout: 3000 }).catch(() => {
        // Skeleton might already be gone
      });
      
      // Wait for actual content to be visible
      await this.page!.waitForSelector('.bg-white.rounded-lg.shadow-md:not(.animate-pulse)', { timeout: 5000 }).catch(() => {
        // No subjects might be available
      });

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

        // Brief pause between evaluations
        if (subject !== subjects[subjects.length - 1]) {
          await this.page!.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});
        }
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
      
      // Take screenshot on critical failure
      if (this.page) {
        try {
          const timestamp = new Date().getTime();
          await this.page.screenshot({ path: `critical-error-${timestamp}.png`, fullPage: true });
          console.error(`📸 Screenshot saved: critical-error-${timestamp}.png`);
        } catch {
          // Ignore screenshot errors
        }
      }
      
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
function parseArgs(): Partial<EvaluationConfig> & { limit?: number } {
  const args = process.argv.slice(2);
  const config: Partial<EvaluationConfig> & { limit?: number } = {};

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
    } else if (args[i] === '--limit' && args[i + 1]) {
      config.limit = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return config;
}

/**
 * Fetch students from the database via API
 */
async function fetchStudentsFromAPI(baseUrl: string, limit?: number): Promise<Array<{ number: string; name: string }>> {
  try {
    const url = new URL('/api/test/students', baseUrl);
    if (limit) {
      url.searchParams.set('limit', limit.toString());
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && Array.isArray(data)) {
      return data.map((student: any) => ({
        number: student.student_number,
        name: student.full_name
      }));
    }
    
    return [];
  } catch (error) {
    console.error('⚠️  Could not fetch students from API:', (error as Error).message);
    console.error('   Make sure the server is running and accessible');
    console.error(`   Tried: ${baseUrl}/api/test/students\n`);
    return [];
  }
}

/**
 * Process students in parallel batches
 */
async function processStudentBatch(
  students: Array<{ number: string; name: string }>,
  config: Partial<EvaluationConfig>,
  batchNumber: number,
  totalBatches: number
): Promise<{ success: number; failed: number }> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BATCH ${batchNumber}/${totalBatches} - Processing ${students.length} students in parallel`);
  console.log('='.repeat(60) + '\n');

  const results = await Promise.allSettled(
    students.map(async (student) => {
      const studentConfig = {
        ...config,
        studentNumber: student.number,
        baseUrl: config.baseUrl || 'http://localhost:3000',
        headless: config.headless !== undefined ? config.headless : false
      };

      const automation = new StudentEvaluationAutomation(studentConfig);

      try {
        await automation.run();
        console.log(`✓ [Batch ${batchNumber}] ${student.name} completed successfully`);
        return { success: true, student };
      } catch (error) {
        console.error(`✗ [Batch ${batchNumber}] ${student.name} failed:`, (error as Error).message);
        return { success: false, student };
      }
    })
  );

  const successCount = results.filter(
    r => r.status === 'fulfilled' && r.value.success
  ).length;
  const failedCount = results.length - successCount;

  console.log(`\n✓ Batch ${batchNumber} complete: ${successCount} successful, ${failedCount} failed\n`);

  return { success: successCount, failed: failedCount };
}

/**
 * Main execution
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   STUDENT EVALUATION AUTOMATION SCRIPT                   ║');
  console.log('║   Automated Testing for CCS Faculty Evaluation System    ║');
  console.log('║   🚀 Supports 10 Parallel Browsers for Fast Testing      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const config = parseArgs();
  const PARALLEL_LIMIT = 10; // Number of simultaneous browsers
  
  // If no specific student is provided, test all students from database
  if (!config.studentNumber) {
    const baseUrl = config.baseUrl || 'http://localhost:3000';
    const limit = config.limit; // Optional limit on number of students to test
    
    console.log('Configuration:');
    console.log(`  Testing Mode: ALL STUDENTS${limit ? ` (limited to ${limit})` : ''}`);
    console.log(`  Base URL: ${baseUrl}`);
    console.log(`  Headless: ${config.headless !== undefined ? config.headless : false}`);
    console.log(`  Slow Motion: ${config.slowMo || 100}ms\n`);
    
    console.log('📡 Fetching students from database...\n');
    const students = await fetchStudentsFromAPI(baseUrl, limit);
    
    if (students.length === 0) {
      console.error('❌ No students found or could not connect to server');
      console.error('   Please ensure:');
      console.error('   1. The server is running (npm start)');
      console.error('   2. The database has been set up (npm run setup-db)');
      console.error('   3. The base URL is correct\n');
      process.exit(1);
    }
    
    console.log(`✓ Found ${students.length} students to test\n`);
    console.log('Students to test:');
    students.slice(0, 10).forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (${student.number})`);
    });
    if (students.length > 10) {
      console.log(`  ... and ${students.length - 10} more`);
    }
    console.log(`\n🔥 Running with ${PARALLEL_LIMIT} parallel browsers\n`);

    let totalSuccess = 0;
    let totalFail = 0;

    // Process students in batches of PARALLEL_LIMIT
    const batches: Array<typeof students> = [];
    for (let i = 0; i < students.length; i += PARALLEL_LIMIT) {
      batches.push(students.slice(i, i + PARALLEL_LIMIT));
    }

    console.log(`📦 Processing ${students.length} students in ${batches.length} batches\n`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await processStudentBatch(
        batch,
        config,
        i + 1,
        batches.length
      );

      totalSuccess += batchResults.success;
      totalFail += batchResults.failed;

      // Brief pause between batches to avoid overwhelming the server
      if (i < batches.length - 1) {
        console.log('⏳ Waiting 3 seconds before next batch...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
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
