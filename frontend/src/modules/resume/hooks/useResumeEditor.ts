import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Resume,
  CreateResumeRequest,
  ContactInfo,
  WorkExperience,
  Education,
} from '@/shared/types/api';
import { REFRESH_TOKEN_ERROR } from '@/shared/lib/auth';
import apiClient from '@/shared/lib/api-client';
import { ApiRequestError } from '@/shared/types/error';
import { ErrorService } from '@/services/errorService';
import { useToast } from '@/components/Toast';
import { useDraftRecovery } from '@/modules/editor/hooks/useDraftRecovery';

interface ResumeDraftData {
  contact: ContactInfo;
  summary: string;
  work_experience: WorkExperience[];
  education: Education[];
  skills: string[];
  achievements: string[];
}

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
  achievements: [],
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
  setAchievements: (achievements: string[]) => void;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  clearError: () => void;
  showDraftRecovery: boolean;
  recoveredDraft: ResumeDraftData | null;
  acceptDraft: () => void;
  dismissDraft: () => void;
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

  const isEmptyResumeDraft = useCallback(
    (d: ResumeDraftData) =>
      !d.summary &&
      !d.contact.full_name &&
      d.work_experience.length === 0 &&
      d.education.length === 0 &&
      d.skills.length === 0,
    []
  );

  const { saveDraft, loadDraft, clearDraft, startAutosave, stopAutosave } =
    useDraftRecovery<ResumeDraftData>({
      contentType: 'resume',
      isEmpty: isEmptyResumeDraft,
    });

  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<ResumeDraftData | null>(null);
  const resumeRef = useRef(resume);
  resumeRef.current = resume;
  const isDirtyRef = useRef(false);
  const hasCheckedDraftRef = useRef(false);
  const fetchDoneRef = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const setContact = useCallback((contact: ContactInfo) => {
    isDirtyRef.current = true;
    setResume((prev) => ({ ...prev, contact }));
  }, []);

  const setSummary = useCallback((summary: string) => {
    isDirtyRef.current = true;
    setResume((prev) => ({ ...prev, summary }));
  }, []);

  const setWorkExperience = useCallback(
    (work_experience: WorkExperience[]) => {
      isDirtyRef.current = true;
      setResume((prev) => ({ ...prev, work_experience }));
    },
    []
  );

  const setEducation = useCallback((education: Education[]) => {
    isDirtyRef.current = true;
    setResume((prev) => ({ ...prev, education }));
  }, []);

  const setSkills = useCallback((skills: string[]) => {
    isDirtyRef.current = true;
    setResume((prev) => ({ ...prev, skills }));
  }, []);

  const setAchievements = useCallback((achievements: string[]) => {
    isDirtyRef.current = true;
    setResume((prev) => ({ ...prev, achievements }));
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
        if (!cancelled) {
          setIsLoading(false);
          fetchDoneRef.current = true;
        }
      }
    }

    fetchResume();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;

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
        achievements: resume.achievements || [],
      };

      let result: Resume;
      if (isExisting) {
        result = await apiClient.resume.update(payload, session.accessToken);
      } else {
        result = await apiClient.resume.create(payload, session.accessToken);
      }

      setResume(result);
      setIsExisting(true);
      clearDraft();
      stopAutosave();
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
  }, [session, resume, isExisting, isSaving, showToast, clearDraft, stopAutosave]);

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

  const getCurrentResumeDraftState = useCallback((): ResumeDraftData => {
    const current = resumeRef.current;
    return {
      contact: current.contact || EMPTY_CONTACT,
      summary: current.summary || '',
      work_experience: current.work_experience || [],
      education: current.education || [],
      skills: current.skills || [],
      achievements: current.achievements || [],
    };
  }, []);

  // Check for recovered draft on initial load
  useEffect(() => {
    if (isLoading || hasCheckedDraftRef.current || !fetchDoneRef.current) return;
    hasCheckedDraftRef.current = true;
    const draft = loadDraft();
    if (draft && (draft.summary || draft.contact.full_name || draft.work_experience.length > 0)) {
      const current = resumeRef.current;
      if (
        draft.summary !== (current.summary || '') ||
        draft.contact.full_name !== (current.contact?.full_name || '') ||
        draft.work_experience.length !== (current.work_experience?.length || 0)
      ) {
        setRecoveredDraft(draft);
        setShowDraftRecovery(true);
      }
    }
  }, [isLoading, loadDraft]);

  // Start autosave timer
  useEffect(() => {
    startAutosave(() => {
      if (!isDirtyRef.current) return null;
      return getCurrentResumeDraftState();
    });
    return () => stopAutosave();
  }, [startAutosave, stopAutosave, getCurrentResumeDraftState]);

  // Save draft on beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        saveDraft(getCurrentResumeDraftState());
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [saveDraft, getCurrentResumeDraftState]);

  // Save draft on session error
  useEffect(() => {
    if (session?.error !== REFRESH_TOKEN_ERROR) return;
    const current = resumeRef.current;
    if (current.summary || current.contact?.full_name) {
      saveDraft(getCurrentResumeDraftState());
    }
  }, [session?.error, saveDraft, getCurrentResumeDraftState]);

  const acceptDraft = useCallback(() => {
    if (recoveredDraft) {
      setResume((prev) => ({ ...prev, ...recoveredDraft }));
      isDirtyRef.current = true;
    }
    setShowDraftRecovery(false);
  }, [recoveredDraft]);

  const dismissDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecovery(false);
    setRecoveredDraft(null);
  }, [clearDraft]);

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
    setAchievements,
    handleSave,
    handleDelete,
    clearError,
    showDraftRecovery,
    recoveredDraft,
    acceptDraft,
    dismissDraft,
  };
}
