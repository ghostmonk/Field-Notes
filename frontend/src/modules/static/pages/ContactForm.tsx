import { useState, useRef, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import {
  Button,
  Input,
  Textarea,
  FormField,
  TurnstileWidget,
  HoneypotField,
} from '@/components/ui';
import apiClient from '@/shared/lib/api-client';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
  turnstile?: string;
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function ContactForm() {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user?.email;

  const [name, setName] = useState('');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');

  const mountTime = useRef(Date.now());
  const isSubmitting = formState === 'submitting';

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!isAuthenticated) {
      if (!name.trim()) errs.name = 'Name is required';
      else if (name.trim().length > 100)
        errs.name = 'Name must be 100 characters or less';

      if (!email.trim()) errs.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        errs.email = 'Enter a valid email address';
    }

    if (!message.trim()) errs.message = 'Message is required';
    else if (message.trim().length > 2000)
      errs.message = 'Message must be 2000 characters or less';

    if (!turnstileToken && TURNSTILE_SITE_KEY)
      errs.turnstile = 'Please complete the verification';

    return errs;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormState('submitting');
    setSubmitError('');

    try {
      await apiClient.contact.submit({
        name: isAuthenticated
          ? (session?.user?.name || session?.user?.email?.split('@')[0] || '')
          : name.trim(),
        email: isAuthenticated ? (session?.user?.email || '') : email.trim(),
        message: message.trim(),
        turnstile_token: turnstileToken,
        honeypot,
        elapsed_ms: Date.now() - mountTime.current,
      });
      setFormState('success');
    } catch {
      setFormState('error');
      setSubmitError('Something went wrong. Please try again later.');
    }
  };

  if (formState === 'success') {
    return (
      <div className="card" data-testid="contact-success">
        <p className="text-text-primary">
          Thank you for your message. I will get back to you soon.
        </p>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(' ')[0] || '';

  return (
    <form
      onSubmit={handleSubmit}
      className="card"
      data-testid="contact-form"
      noValidate
    >
      <div className="flex flex-col gap-4">
        {isAuthenticated && firstName && (
          <p className="text-text-primary" data-testid="contact-greeting">
            Hi {firstName}, send me a message below and I&apos;ll get back to you.
          </p>
        )}
        {!isAuthenticated && (
          <FormField
            label="Name"
            htmlFor="contact-name"
            required
            error={errors.name}
          >
            <Input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              error={!!errors.name}
              disabled={isSubmitting}
              data-testid="contact-name"
            />
          </FormField>
        )}

        {!isAuthenticated && (
          <FormField
            label="Email"
            htmlFor="contact-email"
            required
            error={errors.email}
          >
            <Input
              id="contact-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              disabled={isSubmitting}
              data-testid="contact-email"
            />
          </FormField>
        )}

        <FormField
          label="Message"
          htmlFor="contact-message"
          required
          error={errors.message}
        >
          <Textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={6}
            error={!!errors.message}
            disabled={isSubmitting}
            data-testid="contact-message"
          />
        </FormField>

        <HoneypotField value={honeypot} onChange={setHoneypot} />

        {TURNSTILE_SITE_KEY && (
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken('')}
            onError={() => {
              setTurnstileToken('');
              setErrors((prev) => ({
                ...prev,
                turnstile: 'Verification failed to load. Please refresh and try again.',
              }));
            }}
          />
        )}

        {errors.turnstile && (
          <span className="form-field__error" role="alert">
            {errors.turnstile}
          </span>
        )}

        {submitError && (
          <span
            className="form-field__error"
            role="alert"
            data-testid="contact-error"
          >
            {submitError}
          </span>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Send Message
        </Button>
      </div>
    </form>
  );
}
