import { UseResumeEditorReturn } from '../hooks/useResumeEditor';
import { ContactForm } from './ContactForm';
import { WorkExperienceForm } from './WorkExperienceForm';
import { EducationForm } from './EducationForm';
import { SkillsForm } from './SkillsForm';
import { ErrorDisplay } from '@/components/ErrorDisplay';

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
      {error && <ErrorDisplay error={error} onDismiss={clearError} />}

      <ContactForm
        contact={resume.contact || { full_name: '', email: '' }}
        onChange={setContact}
      />

      <div>
        <h3 className="text-lg font-semibold mb-2">Summary</h3>
        <textarea
          value={resume.summary || ''}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          placeholder="Brief professional summary..."
          className="w-full px-3 py-2 border rounded-md bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]"
        />
      </div>

      <WorkExperienceForm
        items={resume.work_experience || []}
        onChange={setWorkExperience}
      />

      <EducationForm
        items={resume.education || []}
        onChange={setEducation}
      />

      <SkillsForm skills={resume.skills || []} onChange={setSkills} />

      <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
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
