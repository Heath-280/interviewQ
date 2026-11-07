/**
 * Canonical skill dictionary used for lightweight, offline resume parsing.
 * Matching is case-insensitive with word boundaries.
 */
export const SKILL_DICTIONARY: string[] = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP',
  'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Dart', 'Elixir', 'Haskell', 'Lua',
  'SQL', 'Bash', 'Shell',
  // Frontend
  'React', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'Redux', 'Zustand', 'MobX',
  'Tailwind CSS', 'SASS', 'CSS', 'HTML', 'HTML5', 'CSS3', 'Webpack', 'Vite', 'Rollup',
  'jQuery', 'Storybook', 'React Native', 'Flutter',
  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'Laravel', 'Rails', 'ASP.NET', 'GraphQL', 'REST', 'gRPC', 'WebSockets', 'Microservices',
  // Databases
  'MongoDB', 'PostgreSQL', 'MySQL', 'SQLite', 'Redis', 'Cassandra', 'DynamoDB', 'Elasticsearch',
  'Oracle', 'MariaDB', 'Firebase', 'Supabase', 'Prisma', 'Mongoose', 'Sequelize',
  // Cloud / DevOps
  'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible',
  'Jenkins', 'GitHub Actions', 'GitLab CI', 'CircleCI', 'CI/CD', 'Linux', 'Nginx', 'Apache',
  'Serverless', 'Lambda', 'EC2', 'S3', 'CloudFront', 'Heroku', 'Vercel', 'Netlify',
  // Data / ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas',
  'NumPy', 'Keras', 'NLP', 'Computer Vision', 'Data Analysis', 'Data Science', 'Spark',
  'Hadoop', 'Kafka', 'Airflow', 'Tableau', 'Power BI', 'ETL', 'A/B Testing',
  // Tooling / practices
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Agile', 'Scrum', 'Kanban',
  'TDD', 'Unit Testing', 'Jest', 'Mocha', 'Cypress', 'Playwright', 'Selenium', 'Vitest',
  'Postman', 'Figma', 'Adobe XD', 'Sketch', 'Swagger', 'OpenAPI',
  // Security / auth
  'OAuth', 'JWT', 'OAuth2', 'Auth0', 'SSO', 'JWT Authentication', 'Penetration Testing',
  'OWASP', 'Cybersecurity',
  // Soft skills
  'Leadership', 'Communication', 'Teamwork', 'Problem Solving', 'Critical Thinking',
  'Time Management', 'Adaptability', 'Mentoring', 'Collaboration', 'Project Management',
  'Public Speaking', 'Negotiation', 'Customer Service', 'Stakeholder Management',
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds dictionary skills mentioned in the resume text. Longest phrases are
 * matched first so "Machine Learning" wins over "Learning".
 */
export function extractSkills(text: string): string[] {
  if (!text) return [];
  const haystack = text.replace(/\s+/g, ' ');
  const sorted = [...SKILL_DICTIONARY].sort((a, b) => b.length - a.length);
  const found = new Set<string>();
  for (const skill of sorted) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9+#])${escapeRegExp(skill)}([^A-Za-z0-9+#]|$)`, 'i');
    if (pattern.test(haystack)) {
      found.add(skill);
    }
  }
  return Array.from(found).sort((a, b) => a.localeCompare(b));
}
