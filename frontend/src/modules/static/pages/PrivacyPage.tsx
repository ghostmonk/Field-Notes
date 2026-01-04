import React from 'react';
import Head from 'next/head';

export const PrivacyPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Privacy Policy | Ghostmonk</title>
                <meta name="description" content="Privacy Policy for Ghostmonk" />
            </Head>

            <div className="page-container">
                <h1 className="page-title">Privacy Policy</h1>

                <div className="card">
                    <div className="prose prose--card">
                        <p><strong>Last updated:</strong> January 2, 2025</p>

                        <h2>1. Introduction</h2>
                        <p>
                            This Privacy Policy explains how Ghostmonk (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and
                            protects your information when you visit ghostmonk.com.
                        </p>

                        <h2>2. Information We Collect</h2>

                        <h3>Information you provide</h3>
                        <p>When you sign in with Google, we receive:</p>
                        <ul>
                            <li><strong>Email address:</strong> Used to identify your account</li>
                            <li><strong>Name:</strong> Displayed with your comments</li>
                            <li><strong>Profile picture:</strong> Displayed with your comments</li>
                        </ul>

                        <h3>Information collected automatically</h3>
                        <p>We may collect standard web analytics data including:</p>
                        <ul>
                            <li>Pages visited and time spent</li>
                            <li>Browser type and device information</li>
                            <li>IP address (anonymized)</li>
                            <li>Referring website</li>
                        </ul>

                        <h2>3. How We Use Your Information</h2>
                        <p>We use your information to:</p>
                        <ul>
                            <li>Authenticate your account and display your identity on comments</li>
                            <li>Enable reactions and comments on content</li>
                            <li>Improve the website and user experience</li>
                            <li>Prevent abuse and enforce our Terms of Service</li>
                        </ul>

                        <h2>4. Data Storage and Security</h2>
                        <p>
                            Your data is stored securely using industry-standard practices. We use encrypted
                            connections (HTTPS) and secure cloud infrastructure to protect your information.
                        </p>

                        <h2>5. Third-Party Services</h2>
                        <p>We use the following third-party services:</p>
                        <ul>
                            <li><strong>Google Authentication:</strong> For secure sign-in (governed by Google&apos;s Privacy Policy)</li>
                            <li><strong>Google Cloud Platform:</strong> For hosting and data storage</li>
                        </ul>

                        <h2>6. Cookies</h2>
                        <p>
                            We use essential cookies to maintain your login session. These are necessary for the
                            site to function and cannot be disabled while using authenticated features.
                        </p>

                        <h2>7. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li><strong>Access:</strong> Request a copy of your personal data</li>
                            <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                            <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                            <li><strong>Withdraw consent:</strong> Sign out and stop using authenticated features at any time</li>
                        </ul>
                        <p>
                            To exercise these rights, please contact us using the contact form on this site.
                        </p>

                        <h2>8. Data Retention</h2>
                        <p>
                            We retain your account information and comments for as long as your account is active.
                            Deleted comments are soft-deleted and may be fully purged after 30 days.
                        </p>

                        <h2>9. Children&apos;s Privacy</h2>
                        <p>
                            This site is not intended for children under 13. We do not knowingly collect
                            information from children under 13.
                        </p>

                        <h2>10. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. We will notify users of
                            significant changes by updating the &quot;Last updated&quot; date.
                        </p>

                        <h2>11. Contact</h2>
                        <p>
                            For privacy-related questions or to exercise your data rights, please use the
                            contact form on this site.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PrivacyPage;
