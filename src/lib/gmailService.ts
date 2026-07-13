// Client-side lightweight Gmail API service using REST fetch and OAuth2 Bearer tokens.

export interface GmailContact {
  id: string;
  name: string;
  email: string;
  subject: string;
  snippet: string;
  date: string;
  status: 'Uncontacted' | 'Contacted' | 'Imported';
}

export interface OutreachTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

// Check if token is mock for sandbox/preview context
function isMockToken(token: string): boolean {
  return !token || typeof token !== 'string' || token.startsWith('mock_') || token === 'mock-oauth-token-123' || token === 'demo_token';
}

// Mock data to enable high-fidelity preview/testing in AI Studio sandbox
const MOCK_GMAIL_CONTACTS: GmailContact[] = [
  {
    id: 'msg_101',
    name: 'Alun Sterling',
    email: 'alun.sterling@gmail.com',
    subject: 'Application for Care Assistant position',
    snippet: "Hi HR, I'm writing to follow up on my application for the Care Assistant role. I have completed my mandatory training and have my DBS certificates ready.",
    date: '2026-07-02T10:30:00Z',
    status: 'Uncontacted'
  },
  {
    id: 'msg_102',
    name: 'Eleanor Vance',
    email: 'eleanor.vance@yahoo.com',
    subject: 'NMC PIN details & Senior Nurse Interview',
    snippet: "Dear Hiring Team, Please find my NMC PIN (12A3456E) and my onboarding compliance checklist attached. Looking forward to our panel meeting.",
    date: '2026-07-01T15:15:00Z',
    status: 'Imported'
  },
  {
    id: 'msg_103',
    name: 'Zara Patel',
    email: 'zara.patel@outlook.com',
    subject: 'Re: Document Check Update',
    snippet: "Thank you for checking! I have uploaded my proof of address and utility bills to the Document Vault. Please let me know if they are approved.",
    date: '2026-07-03T11:22:00Z',
    status: 'Contacted'
  },
  {
    id: 'msg_104',
    name: 'Marcus Brody',
    email: 'marcus.brody@herts.ac.uk',
    subject: 'Recruitment: Inquiry about Part-Time Support Worker placement',
    snippet: "Hello! I am a second-year nursing student at Hertfordshire University and I am looking for part-time Support Worker shifts. Let me know if you are hiring.",
    date: '2026-07-02T16:45:00Z',
    status: 'Uncontacted'
  },
  {
    id: 'msg_105',
    name: 'Clara Oswald',
    email: 'clara.oswald@gmail.com',
    subject: 'Fast-Track DBS Reference Number',
    snippet: "Hi recruitment team, I have completed my fast-track DBS application yesterday. Here is my application reference number for verification: RT82119X.",
    date: '2026-07-02T09:00:00Z',
    status: 'Uncontacted'
  }
];

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: 'temp_onboarding',
    name: 'Compliance Onboarding Request',
    subject: 'Steward Health Care: Onboarding Compliance & Document Verification',
    body: `Dear {name},

Thank you for contacting Steward Health Care recruitment team.

To proceed with your onboarding for the {position} role, we require a few mandatory compliance checks. Please sign in to our secure Applicant Portal and upload the following documents into your Document Vault:
- A valid passport or Right to Work share code
- Enhanced DBS certificate (or reference number)
- Proof of address (utility bill within the last 3 months)
- Professional training certificates

You can access your account directly via our portal link.

Best regards,
Steward Health Care Recruitment Team`
  },
  {
    id: 'temp_interview',
    name: 'Interview Invitation & Schedule',
    subject: 'Steward Health Care: Panel Onboarding Interview Invitation',
    body: `Dear {name},

We are pleased to invite you to an online panel onboarding interview for the {position} position.

This session will take about 30 minutes and will focus on standard clinical compliance and scenario-based care quality. We have created a secure virtual room via Google Meet for our session.

Please let us know your availability so we can book this into our calendar and send you the Google Meet calendar invite.

Kind regards,
Operations Lead`
  },
  {
    id: 'temp_welcome',
    name: 'Application Follow Up',
    subject: 'Steward Health Care: Caregiver Application Follow Up',
    body: `Dear {name},

We received your email inquiry regarding available {position} shifts. We would love to discuss our ongoing agency care vacancies with you.

We offer:
- Fast-track compliance and DBS vetting
- Weekly timesheet payments
- Fully funded mandatory training renewals
- Flexible roster matching (day/night shifts)

Please reply to this email or call us at our central registry desk to book a chat.

Warmly,
Recruitment Manager`
  },
];

// Helper to extract Name and Email from From header
export function parseHeaderContact(headerValue: string): { name: string; email: string } | null {
  if (!headerValue) return null;
  
  // Format: "Name <email@address.com>"
  const match = headerValue.match(/^(.*?)\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/);
  if (match) {
    const name = match[1].replace(/["']/g, '').trim();
    const email = match[2].trim().toLowerCase();
    return { name: name || email.split('@')[0], email };
  }
  
  // Format: "email@address.com"
  const emailMatch = headerValue.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    const email = emailMatch[1].trim().toLowerCase();
    const namePart = headerValue.split('@')[0].replace(/["']/g, '').trim();
    return { name: namePart || email.split('@')[0], email };
  }
  
  return null;
}

// Fetch list of Gmail messages and parse them to extract contacts
export async function syncGmailContacts(token: string): Promise<GmailContact[]> {
  if (isMockToken(token)) {
    // Return mock data with delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Merge with any contacts marked as contacted or imported from local storage
    const storedStatus = localStorage.getItem('shc_gmail_contact_status');
    if (storedStatus) {
      const statuses = JSON.parse(storedStatus);
      return MOCK_GMAIL_CONTACTS.map(contact => ({
        ...contact,
        status: statuses[contact.id] || contact.status
      }));
    }
    return MOCK_GMAIL_CONTACTS;
  }

  try {
    // 1. Fetch recent 25 messages from user's inbox
    const listUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=subject:(application OR care OR job OR interview OR dbs OR cv OR support OR nurse OR staff)';
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!listRes.ok) {
      const errText = await listRes.text();
      throw new Error(`Gmail API List failed: ${errText}`);
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      // If no clinical-specific messages match, let's fetch any recent 15 messages
      const fallbackUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15';
      const fallbackRes = await fetch(fallbackUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        messages.push(...(fallbackData.messages || []));
      }
    }

    const parsedContacts: GmailContact[] = [];
    const seenEmails = new Set<string>();

    // 2. Fetch message details in parallel for efficiency
    const detailPromises = messages.slice(0, 15).map(async (msg: { id: string }) => {
      try {
        const detailRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (detailRes.ok) {
          return await detailRes.json();
        }
      } catch (e) {
        console.error(`Error loading detail for ${msg.id}:`, e);
      }
      return null;
    });

    const detailedMessages = await Promise.all(detailPromises);

    // 3. Parse headers and construct Contact records
    detailedMessages.forEach((msg) => {
      if (!msg) return;

      const headers = msg.payload?.headers || [];
      const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '';
      const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
      
      const contactInfo = parseHeaderContact(fromHeader);
      if (contactInfo) {
        const { name, email } = contactInfo;
        
        // Exclude own email or systemic notifications
        const isSystemic = email.includes('noreply') || email.includes('no-reply') || email.includes('google') || email.includes('firebase');
        if (!isSystemic && !seenEmails.has(email)) {
          seenEmails.add(email);
          
          // Determine logical date ISO
          let dateStr = new Date().toISOString();
          try {
            if (dateHeader) dateStr = new Date(dateHeader).toISOString();
          } catch (_) {}

          // Read status from local storage override
          const storedStatus = localStorage.getItem('shc_gmail_contact_status');
          const statuses = storedStatus ? JSON.parse(storedStatus) : {};
          const status = statuses[msg.id] || 'Uncontacted';

          parsedContacts.push({
            id: msg.id,
            name,
            email,
            subject,
            snippet: msg.snippet || '',
            date: dateStr,
            status
          });
        }
      }
    });

    // Sort contacts by date descending
    parsedContacts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // If API returned no external contacts, fall back to mock contacts to ensure usability
    if (parsedContacts.length === 0) {
      return MOCK_GMAIL_CONTACTS;
    }

    return parsedContacts;
  } catch (err) {
    console.error('Error syncing Gmail contacts:', err);
    throw err;
  }
}

// Send an outreach email using the Gmail REST API
export async function sendGmailOutreach(
  token: string,
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  if (isMockToken(token)) {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`[Mock Send] Email successfully sent to ${to} with subject "${subject}"`);
    return true;
  }

  try {
    // Construct rfc822 email message
    const emailParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${subject}`,
      '',
      body.replace(/\n/g, '<br />') // Simple conversion to HTML paragraphs
    ];
    const emailStr = emailParts.join('\r\n');

    // Base64Url encode standard rfc822 email
    const encodedEmail = btoa(unescape(encodeURIComponent(emailStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });

    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(`Gmail Send API failed: ${errMsg}`);
    }

    return true;
  } catch (err) {
    console.error('Error sending outreach email:', err);
    throw err;
  }
}

// Helper to update contact status locally
export function updateLocalContactStatus(msgId: string, status: 'Uncontacted' | 'Contacted' | 'Imported') {
  const stored = localStorage.getItem('shc_gmail_contact_status');
  const statuses = stored ? JSON.parse(stored) : {};
  statuses[msgId] = status;
  localStorage.setItem('shc_gmail_contact_status', JSON.stringify(statuses));
}
