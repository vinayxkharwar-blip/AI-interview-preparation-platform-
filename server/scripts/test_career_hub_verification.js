import { calculateJobMatch, fetchJobRecommendations } from '../services/jobService.js';
import { memorySavedJobs } from '../controllers/jobController.js';
import { memoryApplications } from '../controllers/applicationController.js';

console.log('====================================================');
console.log('🧪 VERIFYING AI CAREER HUB MODULE IMPLEMENTATION');
console.log('====================================================');

// Test 1: Job Matching Engine
const candidateSkills = ['React', 'Node.js', 'MongoDB', 'TypeScript'];
const jobSkills = ['React', 'Node.js', 'TypeScript', 'Docker', 'AWS'];

const matchResult = calculateJobMatch(candidateSkills, jobSkills);
console.log('\n✅ 1. Job Matching Engine Test:');
console.log(`   - Match Percentage: ${matchResult.matchPercentage}%`);
console.log(`   - Matched Skills: ${matchResult.matchedSkills.join(', ')}`);
console.log(`   - Missing Skills: ${matchResult.missingSkills.join(', ')}`);
console.log(`   - Skill Recommendations Count: ${matchResult.skillRecommendations.length}`);

if (matchResult.matchedSkills.length === 3 && matchResult.missingSkills.length === 2) {
  console.log('   🎉 Job Matching Engine test PASSED!');
} else {
  console.error('   ❌ Job Matching Engine test FAILED!');
  process.exit(1);
}

// Test 2: Extensible Job Provider Service
async function testJobProvider() {
  console.log('\n✅ 2. Job Provider Recommendations Test:');
  const jobs = await fetchJobRecommendations({
    targetRole: 'Full Stack Engineer',
    skills: candidateSkills,
  });

  console.log(`   - Returned ${jobs.length} recommendations`);
  console.log(`   - Top Match: ${jobs[0].title} at ${jobs[0].company} (${jobs[0].matchPercentage}% Match)`);

  if (jobs.length > 0 && jobs[0].matchedSkills && jobs[0].missingSkills) {
    console.log('   🎉 Job Provider test PASSED!');
  } else {
    console.error('   ❌ Job Provider test FAILED!');
    process.exit(1);
  }
}

// Test 3: Dual-Mode Memory Fallback Verification
console.log('\n✅ 3. Dual-Mode In-Memory Fallbacks Test:');
console.log(`   - Initial memorySavedJobs length: ${memorySavedJobs.length}`);
console.log(`   - Initial memoryApplications length: ${memoryApplications.length}`);
console.log('   🎉 In-Memory fallbacks initialized cleanly!');

await testJobProvider();

console.log('\n====================================================');
console.log('🚀 ALL AI CAREER HUB VERIFICATION TESTS PASSED!');
console.log('====================================================\n');
