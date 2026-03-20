import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Resume,
  CreateResumeRequest,
  ContactInfo,
  WorkExperience,
  Education,
} from '@/shared/types/api';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { useToast } from '@/components/Toast';

const EMPTY_CONTACT: ContactInfo = {
  full_name: '',
  email: '',
  phone: undefined,
  location: undefined,
  website: undefined,
  linkedin: undefined,
  github: undefined,
};

const EMPTY_RESUME: Partial<Resume> = {
  contact: EMPTY_CONTACT,
  summary: '',
  work_experience: [],
  education: [],
  skills: [],
};

export interface UseResumeEditorReturn {
  resume: Partial<Resume>;
  error: string | null;
  isSaving: boolean;
  isLoading: boolean;
  isExisting: boolean;
  setContact: (contact: ContactInfo) => void;
  setSummary: (summary: string) => void;
  setWorkExperience: (work: WorkExperience[]) => void;
  setEducation: (edu: Education[]) => void;
  setSkills: (skills: string[]) => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  clearError: () => void;
}

export function useResumeEditor(): UseResumeEditorReturn {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [resume, setResume] = useState<Partial<Resume>>(EMPTY_RESUME);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExisting, setIsExisting] = useState(false);
  const accessToken = session?.accessToken;

  const clearError = useCallback(() => setError(null), []);

  const setContact = useCallback((contact: ContactInfo) => {
    setResume((prev) => ({ ...prev, contact }));
  }, []);

  const setSummary = useCallback((summary: string) => {
    setResume((prev) => ({ ...prev, summary }));
  }, []);

  const setWorkExperience = useCallback(
    (work_experience: WorkExperience[]) => {
      setResume((prev) => ({ ...prev, work_experience }));
    },
    []
  );

  const setEducation = useCallback((education: Education[]) => {
    setResume((prev) => ({ ...prev, education }));
  }, []);

  const setSkills = useCallback((skills: string[]) => {
    setResume((prev) => ({ ...prev, skills }));
  }, []);

  // Fetch existing resume on mount
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function fetchResume() {
      setIsLoading(true);
      try {
        const data = await apiClient.resume.get(accessToken!);
        if (!cancelled) {
          setResume(data);
          setIsExisting(true);
        }
      } catch (err) {
        // 404 is expected if no resume exists yet
        if (err instanceof ApiRequestError && err.status === 404) {
          if (!cancelled) setIsExisting(false);
        } else if (!cancelled) {
          setError('Failed to load resume');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchResume();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleSave = useCallback(async () => {
    if (!session?.accessToken) {
      setError('You must be logged in to save');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload: CreateResumeRequest = {
        contact: resume.contact!,
        summary: resume.summary || '',
        work_experience: resume.work_experience || [],
        education: resume.education || [],
        skills: resume.skills || [],
      };

      let result: Resume;
      if (isExisting) {
        result = await apiClient.resume.update(payload, session.accessToken);
      } else {
        result = await apiClient.resume.create(payload, session.accessToken);
      }

      setResume(result);
      setIsExisting(true);
      showToast('Resume saved');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(
          err.status === 401
            ? ErrorService.handleAuthError(err)
            : err.getUserMessage()
        );
      } else {
        setError(
          err instanceof Error ? err.message : 'Failed to save resume'
        );
      }
    } finally {
      setIsSaving(false);
    }
  }, [session, resume, isExisting, showToast]);

  const handleDelete = useCallback(async () => {
    if (!session?.accessToken) {
      setError('Not logged in');
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      await apiClient.resume.delete(session.accessToken);
      setResume(EMPTY_RESUME);
      setIsExisting(false);
      showToast('Resume deleted');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.getUserMessage());
      } else {
        setError('Failed to delete resume');
      }
    } finally {
      setIsSaving(false);
    }
  }, [session, isSaving, showToast]);

  return {
    resume,
    error,
    isSaving,
    isLoading: isLoading || status === 'loading',
    isExisting,
    setContact,
    setSummary,
    setWorkExperience,
    setEducation,
    setSkills,
    handleSave,
    handleDelete,
    clearError,
  };
}
