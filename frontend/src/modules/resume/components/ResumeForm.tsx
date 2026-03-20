import { UseResumeEditorReturn } from '../hooks/useResumeEditor';
import { inlineInput } from '../shared';
import { ContactForm } from './ContactForm';
import { WorkExperienceForm } from './WorkExperienceForm';
import { EducationForm } from './EducationForm';
import { SkillsForm } from './SkillsForm';
import { AchievementsForm } from './AchievementsForm';

interface ResumeFormProps {
  editor: UseResumeEditorReturn;
}

export function ResumeForm({ editor }: ResumeFormProps) {
  const {
    resume,
    error,
    isSaving,
    isLoading,
    setContact,
    setSummary,
    setWorkExperience,
    setEducation,
    setSkills,
    setAchievements,
    handleSave,
    clearError,
  } = editor;

  if (isLoading) {
    return (
      <div className="text-center py-12 text-[var(--color-text-secondary)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div
          className="px-4 py-3 rounded-md bg-red-500/10 text-red-400 text-sm flex justify-between items-center"
          role="alert"
        >
          <span>{error}</span>
          <button onClick={clearError} className="ml-4 hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      <ContactForm
        contact={resume.contact || { full_name: '', email: '' }}
        onChange={setContact}
      />

      <div className="border-t border-[var(--color-border)] pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
          Summary
        </h2>
        <textarea
          value={resume.summary || ''}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Brief professional summary..."
          className={`${inlineInput} resize-none`}
        />
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <WorkExperienceForm
          items={resume.work_experience || []}
          onChange={setWorkExperience}
        />
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <EducationForm
          items={resume.education || []}
          onChange={setEducation}
        />
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <SkillsForm skills={resume.skills || []} onChange={setSkills} />
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <AchievementsForm
          achievements={resume.achievements || []}
          onChange={setAchievements}
        />
      </div>

      <div className="pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
        >
          {isSaving ? 'Saving...' : 'Save Resume'}
        </button>
      </div>
    </div>
  );
}
