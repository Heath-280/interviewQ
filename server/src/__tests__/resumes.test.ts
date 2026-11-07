import request from 'supertest';
import PDFDocument from 'pdfkit';
import { app, auth, registerUser } from './helpers';

function makePdf(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(12).text(text);
    doc.end();
  });
}

const RESUME_TEXT = `
Jordan Rivera
Senior Full Stack Engineer

Experience building web applications with React, TypeScript, Node.js and Express.
Worked with MongoDB and PostgreSQL. Deployed services on AWS using Docker and Kubernetes.
Strong communication and leadership skills, comfortable with Agile and Scrum teams.
`;

describe('Resume routes', () => {
  it('uploads a TXT resume, extracts text, and detects skills', async () => {
    const user = await registerUser();
    const res = await request(app)
      .post('/api/resumes')
      .set(auth(user.token))
      .attach('file', Buffer.from(RESUME_TEXT), {
        filename: 'resume.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(201);
    expect(res.body.resume.extractedText).toContain('Jordan Rivera');
    expect(res.body.resume.wordCount).toBeGreaterThan(5);
    expect(res.body.resume.isPrimary).toBe(true);
    const skills = res.body.resume.skills as string[];
    expect(skills).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js', 'MongoDB']));
  });

  it('extracts text from a real PDF file', async () => {
    const user = await registerUser();
    const pdf = await makePdf('PDF resume content with Python and Django experience.');
    const res = await request(app)
      .post('/api/resumes')
      .set(auth(user.token))
      .attach('file', pdf, { filename: 'resume.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.resume.extractedText.toLowerCase()).toContain('python');
    expect(res.body.resume.skills).toEqual(expect.arrayContaining(['Python', 'Django']));
  });

  it('rejects an unsupported file type', async () => {
    const user = await registerUser();
    const res = await request(app)
      .post('/api/resumes')
      .set(auth(user.token))
      .attach('file', Buffer.from('binary'), {
        filename: 'malware.exe',
        contentType: 'application/octet-stream',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('rejects a request with no file', async () => {
    const user = await registerUser();
    const res = await request(app).post('/api/resumes').set(auth(user.token));
    expect(res.status).toBe(400);
  });

  it('lists resumes with pagination and supports deletion', async () => {
    const user = await registerUser();
    const upload = await request(app)
      .post('/api/resumes')
      .set(auth(user.token))
      .attach('file', Buffer.from(RESUME_TEXT), {
        filename: 'a.txt',
        contentType: 'text/plain',
      });
    const id = upload.body.resume._id as string;

    const list = await request(app).get('/api/resumes?page=1&limit=10').set(auth(user.token));
    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.pagination.total).toBe(1);

    const getOne = await request(app).get(`/api/resumes/${id}`).set(auth(user.token));
    expect(getOne.status).toBe(200);

    const del = await request(app).delete(`/api/resumes/${id}`).set(auth(user.token));
    expect(del.status).toBe(200);

    const after = await request(app).get(`/api/resumes/${id}`).set(auth(user.token));
    expect(after.status).toBe(404);
  });

  it('isolates resumes between users', async () => {
    const owner = await registerUser();
    const intruder = await registerUser();
    const upload = await request(app)
      .post('/api/resumes')
      .set(auth(owner.token))
      .attach('file', Buffer.from(RESUME_TEXT), {
        filename: 'private.txt',
        contentType: 'text/plain',
      });
    const id = upload.body.resume._id as string;

    const res = await request(app).get(`/api/resumes/${id}`).set(auth(intruder.token));
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/resumes');
    expect(res.status).toBe(401);
  });

  it('validates the resume id format', async () => {
    const user = await registerUser();
    const res = await request(app).get('/api/resumes/not-an-id').set(auth(user.token));
    expect(res.status).toBe(400);
  });
});
