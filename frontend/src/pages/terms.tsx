import React from 'react';
import Head from 'next/head';

const TermsPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Terms of Service | Ghostmonk</title>
                <meta name="description" content="Terms of Service for Ghostmonk" />
            </Head>

            <div className="page-container">
                <h1 className="page-title">Terms of Service</h1>

                <div className="card">
                    <div className="prose prose--card">
                        <p><strong>Last updated:</strong> January 2, 2025</p>

                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using this website (ghostmonk.com), you accept and agree to be bound by
                            these Terms of Service. If you do not agree to these terms, please do not use this site.
                        </p>

                        <h2>2. Description of Service</h2>
                        <p>
                            Ghostmonk is a personal blog and portfolio website. Users may view content, and
                            authenticated users may leave comments and reactions on published content.
                        </p>

                        <h2>3. User Accounts</h2>
                        <p>
                            To leave comments or reactions, you must sign in using Google authentication. By signing in,
                            you agree to provide accurate information and to use the service in accordance with these terms.
                        </p>

                        <h2>4. User Conduct</h2>
                        <p>You agree not to:</p>
                        <ul>
                            <li>Post content that is unlawful, harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable</li>
                            <li>Impersonate any person or entity</li>
                            <li>Spam, advertise, or solicit without permission</li>
                            <li>Attempt to interfere with or disrupt the service</li>
                            <li>Collect or harvest user information without consent</li>
                        </ul>

                        <h2>5. Content Ownership</h2>
                        <p>
                            All original content on this site (articles, projects, images) is owned by Ghostmonk unless
                            otherwise noted. Comments and reactions you submit remain your intellectual property, but you
                            grant us a non-exclusive license to display them on the site.
                        </p>

                        <h2>6. Moderation</h2>
                        <p>
                            We reserve the right to remove any comments or content that violates these terms, and to
                            restrict access to users who repeatedly violate these guidelines.
                        </p>

                        <h2>7. Disclaimer of Warranties</h2>
                        <p>
                            This site is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that the
                            service will be uninterrupted, secure, or error-free.
                        </p>

                        <h2>8. Limitation of Liability</h2>
                        <p>
                            Ghostmonk shall not be liable for any indirect, incidental, special, or consequential damages
                            arising from your use of the service.
                        </p>

                        <h2>9. Changes to Terms</h2>
                        <p>
                            We may update these terms from time to time. Continued use of the site after changes
                            constitutes acceptance of the new terms.
                        </p>

                        <h2>10. Contact</h2>
                        <p>
                            For questions about these terms, please use the contact form on this site.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TermsPage;
