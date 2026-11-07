import { Resume, type IResumeDocument } from '../../models/Resume';
import { ApiError } from '../../utils/ApiError';
import { buildPaginated, type PaginatedResult, parsePagination } from '../../utils/pagination';
import { removeUploadedFile } from '../../middleware/upload';
import { extractResume } from '../../services/extraction/resumeExtractor';
import { extractSkills } from '../../services/extraction/skills';

export interface CreateResumeOptions {
  isPrimary?: boolean;
}

export async function createResume(
  userId: string,
  file: Express.Multer.File,
  options: CreateResumeOptions = {},
): Promise<IResumeDocument> {
  let extracted;
  try {
    extracted = await extractResume(file.path, file.mimetype);
  } catch (err) {
    removeUploadedFile(file.path);
    throw err;
  }

  const skills = extractSkills(extracted.text);

  const count = await Resume.countDocuments({ userId });
  const isPrimary = options.isPrimary ?? count === 0;

  const resume = await Resume.create({
    userId,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    extractedText: extracted.text,
    wordCount: extracted.wordCount,
    skills,
    summary: extracted.summary,
    isPrimary,
  });

  if (isPrimary) {
    await Resume.updateMany(
      { userId, _id: { $ne: resume._id } },
      { $set: { isPrimary: false } },
    );
  }

  return resume;
}

export async function listResumes(
  userId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<IResumeDocument>> {
  const pagination = parsePagination(query);
  const filter = { userId };
  const [items, total] = await Promise.all([
    Resume.find(filter)
      .sort({ isPrimary: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Resume.countDocuments(filter),
  ]);
  return buildPaginated(items, total, pagination);
}

export async function getResume(userId: string, id: string): Promise<IResumeDocument> {
  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) throw ApiError.notFound('Resume not found');
  return resume;
}

export async function deleteResume(userId: string, id: string): Promise<void> {
  const resume = await Resume.findOneAndDelete({ _id: id, userId });
  if (!resume) throw ApiError.notFound('Resume not found');
  removeUploadedFile(resume.storedName);
}

export async function setPrimary(userId: string, id: string): Promise<IResumeDocument> {
  const resume = await Resume.findOne({ _id: id, userId });
  if (!resume) throw ApiError.notFound('Resume not found');
  await Resume.updateMany({ userId }, { $set: { isPrimary: false } });
  resume.isPrimary = true;
  await resume.save();
  return resume;
}
