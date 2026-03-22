"""
Seed resume data for local development.
Skipped in production (requires MONGO_URI pointing to localhost).
"""

import os
from datetime import datetime, timezone

import pymongo

name = "0012_seed_resume_data"
dependencies = ["0011_create_resumes_collection"]

RESUME_DATA = {
    "contact": {
        "full_name": "Nicholas Hillier",
        "title": "Staff Engineer | AI Systems | Distributed Architecture | Technical Leadership",
        "email": "nicholas@ghostmonk.com",
        "phone": "(514) 778-3361",
        "location": "Longueuil, Quebec, Canada",
        "website": "https://www.ghostmonk.com",
        "linkedin": "https://www.linkedin.com/in/nicholas-h-0523292",
        "github": "https://github.com/ghostmonk",
    },
    "summary": (
        "Builder-first staff engineer with over 20 years delivering quality software solutions "
        "and enterprise-level architectural expertise. Currently building AI-powered healthcare "
        "systems, integrating LLMs into production workflows for clinical insights and automation. "
        "Deep background in distributed systems design, event-driven architectures, and "
        "cloud-native platforms across healthcare, media, retail, and broadcast. "
        "Led teams, owned architecture, and shipped at scale. Comfortable across the full stack "
        "and fluent in multiple languages and paradigms."
    ),
    "work_experience": [
        {
            "company": "Evvy",
            "company_url": "https://www.evvy.com",
            "title": "Software Engineer",
            "start_date": "Apr 2025",
            "end_date": None,
            "current": True,
            "description": (
                "Platform engineer working directly with the CTO on a healthcare platform "
                "integrating microbiome testing with clinical care delivery.\n\n"
                "- Architecting AI-powered features using Claude and LLM APIs for clinical insights, "
                "automated report generation, and intelligent patient interactions.\n"
                "- Building production integrations with external lab systems and treatment protocols.\n"
                "- Designing agent-driven workflows for order processing and patient data pipelines.\n"
                "- Strengthening system observability and operational reliability.\n"
                "- Shaping architectural decisions and mentoring team on AI-augmented development with Cursor."
            ),
            "technologies": [
                "Python",
                "Django",
                "React",
                "Claude API",
                "LLM Orchestration",
                "Cursor",
            ],
        },
        {
            "company": "Ro",
            "company_url": "https://www.ro.co",
            "title": "Staff Engineer",
            "start_date": "Jan 2021",
            "end_date": "Apr 2025",
            "current": False,
            "description": (
                "Led architecture and development on the Clinical Platform team, owning systems "
                "for practitioner-pharmacy interactions, prescription workflows, and secure PHI/PII handling.\n\n"
                "- Architected diagnostics platform from scratch — event-driven microservices enabling "
                "tens of thousands of at-home blood tests with Kit and Quest Diagnostics integration.\n"
                "- Designed and built Benefits Verification and Prior Authorization services, "
                "accelerating insurance access for patients.\n"
                "- Led migration from monolithic Django to distributed microservices architecture.\n"
                "- Built observability stack with Datadog, strengthening incident response and platform reliability."
            ),
            "technologies": [
                "Python",
                "Django",
                "Event-Driven Architecture",
                "Microservices",
                "Datadog",
                "AWS",
            ],
        },
        {
            "company": "Lightspeed HQ",
            "company_url": "https://www.lightspeedhq.com",
            "title": "Principal Software Developer",
            "start_date": "Oct 2018",
            "end_date": "Jan 2021",
            "current": False,
            "description": (
                "Led engineering efforts for Lightspeed's supplier network, streamlining "
                "vendor-client relationships and supply chain management.\n\n"
                "- Architected microservices-based supplier network from the ground up.\n"
                "- Built and led a high-performing engineering team.\n"
                "- Built core services on GCP with Terraform for infrastructure automation.\n"
                "- Developed RESTful APIs for cross-functional integrations."
            ),
            "technologies": ["Go", "Gin", "GCP", "Terraform", "Kubernetes", "TDD"],
        },
        {
            "company": "Shutterstock",
            "company_url": "https://www.shutterstock.com",
            "title": "Software Engineer",
            "start_date": "Jun 2016",
            "end_date": "Aug 2018",
            "current": False,
            "description": (
                "Re-engineered core infrastructure for a global leader in stock photography.\n\n"
                "- Led migration of primary metadata service from Perl/MySQL to Node.js/Java/Cassandra.\n"
                "- Automated deployment pipelines using Terraform and Ansible for zero-downtime releases.\n"
                "- Designed distributed systems for high-volume image metadata transactions.\n"
                "- Developed disaster recovery procedures for Cassandra, reducing downtime from hours to minutes."
            ),
            "technologies": [
                "Java",
                "Node.js",
                "Python",
                "Cassandra",
                "AWS",
                "Terraform",
                "Ansible",
            ],
        },
        {
            "company": "Showcare Event Solutions",
            "company_url": "https://www.showcare.com",
            "title": "Lead Project Developer",
            "start_date": "Apr 2015",
            "end_date": "Jun 2016",
            "current": False,
            "description": (
                "Lead programmer reporting directly to CTO, leading a team of three developers.\n\n"
                "- Replaced SVN with Git and introduced dependency management across the company.\n"
                "- Overhauled JavaScript pipeline with Node, npm, and webpack.\n"
                "- Improved testability and introduced enhanced security for partners.\n"
                "- Contributed to PCI compliance certification."
            ),
            "technologies": ["JavaScript", "Node.js", "Webpack", "Git"],
        },
        {
            "company": "Orckestra Inc.",
            "title": "Senior Programmer",
            "start_date": "Jun 2014",
            "end_date": "Apr 2015",
            "current": False,
            "description": (
                "- Developed Pick and Pack (PnP) application for large retail outlets (Sobeys, Giant Eagle, Thrifty Foods).\n"
                "- Designed two deployment architectures for different network topologies.\n"
                "- Key contributor to architectural design and code quality."
            ),
            "technologies": [
                "ASP.NET MVC",
                "ServiceStack",
                "SQL CE",
                "SQLite",
                "MSSQL",
            ],
        },
        {
            "company": "Grass Valley",
            "company_url": "https://www.grassvalley.com",
            "title": "Group Integration Leader",
            "start_date": "Feb 2013",
            "end_date": "Jun 2014",
            "current": False,
            "description": (
                "- Led Integrations Group for iControl broadcast monitoring and control solution.\n"
                "- Managed customization, deployment, and integration for clients including CBC, NBC, PBS, Verizon, CBS, and Fox.\n"
                "- Responsible for code quality, team development, process development, and resource scheduling."
            ),
            "technologies": ["Linux", "JavaScript", "Java", "SNMP"],
        },
        {
            "company": "Triton Digital",
            "company_url": "https://www.tritondigital.com",
            "title": "Senior Programmer & Technical Lead",
            "start_date": "May 2009",
            "end_date": "Feb 2013",
            "current": False,
            "description": (
                "- Built distributed radio player core API used by most clients.\n"
                "- Refactored UI, reducing code footprint by 40%.\n"
                "- Implemented IoC and Dependency Injection across 50% of the codebase.\n"
                "- Led Scrum adoption with daily standups, retrospectives, and 30+ iterations."
            ),
            "technologies": ["C#", "WPF", ".NET", "WCF", "Entity Framework"],
        },
        {
            "company": "Ghostmonk",
            "title": "Freelance Design & Programming",
            "start_date": "Apr 2005",
            "end_date": "Oct 2012",
            "current": False,
            "description": (
                "- Delivered web projects for CanWest Media Works, Michael Ignatieff MP, Syphr Communications.\n"
                "- Full lifecycle: project management, design, development, and SEO."
            ),
            "technologies": ["PHP", "MySQL", "ActionScript", "CSS", "XHTML"],
        },
        {
            "company": "Indusblue",
            "hide_from_downloads": True,
            "title": "Web Developer",
            "start_date": "Nov 2007",
            "end_date": "May 2009",
            "current": False,
            "description": (
                "- Developed nearly 20 websites for high-profile clients.\n"
                "- Created API for CBC 2008 Beijing Olympics real-time stats.\n"
                "- Awarded ADCC Merit Award for Interactive Site."
            ),
            "technologies": ["ActionScript 3", "PHP", "MySQL", "JavaScript"],
        },
    ],
    "education": [
        {
            "institution": "Concordia University",
            "degree": "Graduate Degree",
            "field_of_study": "Computer Science",
            "start_date": "2012",
            "end_date": "2014",
            "description": None,
        },
        {
            "institution": "Mount Royal University",
            "degree": "BComm",
            "field_of_study": "Journalism",
            "start_date": "2000",
            "end_date": "2005",
            "description": None,
        },
    ],
    "skills": [
        "LLM Integration",
        "AI Systems",
        "System Architecture",
        "Distributed Systems",
        "Event-Driven Architecture",
        "Microservices",
        "Technical Leadership",
        "Python",
        "TypeScript",
        "Node.js",
        "Go",
        "Java",
        "C#",
        "React",
        "Next.js",
        "FastAPI",
        "Django",
        "AWS",
        "GCP",
        "Kubernetes",
        "Terraform",
        "Docker",
        "MongoDB",
        "Cassandra",
        "Datadog",
        "CI/CD",
        "Prompt Engineering",
    ],
    "achievements": [
        "Shipping AI-powered clinical features using Claude API in production at Evvy",
        "Co-authored research on obesity markers presented at the American Diabetes Association",
        "Architected event-driven diagnostics platform enabling tens of thousands of at-home blood tests",
        "Won Ro company-wide hackathon",
        "Built supplier network platform from ground up at Lightspeed, serving retail ecosystem",
        "Awarded ADCC Merit Award for Interactive Site",
    ],
}


def upgrade(db: "pymongo.database.Database"):
    mongo_uri = os.getenv("MONGO_URI", "")
    if "localhost" not in mongo_uri and "127.0.0.1" not in mongo_uri:
        print("Skipping resume seed data (not a local database)")
        return

    users_coll = db["users"]
    resumes_coll = db["resumes"]

    admin = users_coll.find_one({"role": "admin"})
    if not admin:
        print("Skipping resume seed data (no admin user found)")
        return

    user_id = str(admin["_id"])

    existing = resumes_coll.find_one({"user_id": user_id})
    if existing:
        print("Resume already exists, updating...")
        resumes_coll.update_one(
            {"_id": existing["_id"]},
            {"$set": {**RESUME_DATA, "updatedDate": datetime.now(timezone.utc)}},
        )
        return

    now = datetime.now(timezone.utc)
    resumes_coll.insert_one(
        {
            **RESUME_DATA,
            "user_id": user_id,
            "createdDate": now,
            "updatedDate": now,
        }
    )
    print(f"Resume seeded for admin user {admin.get('email', user_id)}")


def downgrade(db: "pymongo.database.Database"):
    mongo_uri = os.getenv("MONGO_URI", "")
    if "localhost" not in mongo_uri and "127.0.0.1" not in mongo_uri:
        print("Skipping resume seed data rollback (not a local database)")
        return

    users_coll = db["users"]
    admin = users_coll.find_one({"role": "admin"})
    if admin:
        db["resumes"].delete_one({"user_id": str(admin["_id"])})
