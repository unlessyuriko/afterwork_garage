const sql = require('mssql');

const REQUIRED_FIELDS = ['eventName', 'name', 'email', 'phoneNumber', 'dateOfBirth', 'organization', 'bringPlusOne', 'interest'];
const PLUS_ONE_FIELDS = ['plusOneName', 'plusOneEmail', 'plusOnePhoneNumber', 'plusOneDateOfBirth', 'plusOneOrganization'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const YANGON_OFFSET_MINUTES = 6 * 60 + 30;

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect({
      server: process.env.SYNAPSE_SERVER,
      database: process.env.SYNAPSE_DATABASE,
      authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: process.env.AZURE_CLIENT_ID,
          clientSecret: process.env.AZURE_CLIENT_SECRET,
          tenantId: process.env.AZURE_TENANT_ID
        }
      },
      options: {
        encrypt: true
      }
    }).catch(function (err) {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

// Server clock is UTC. Shifting the epoch by the Yangon offset means this
// Date's UTC getters (which tedious/mssql reads by default) equal Yangon wall-clock time.
function nowInYangon() {
  return new Date(Date.now() + YANGON_OFFSET_MINUTES * 60 * 1000);
}

function isAtLeast18(dobValue) {
  const dob = new Date(dobValue);
  if (isNaN(dob.getTime())) {
    return false;
  }
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]) {
      return res.status(400).json({ error: 'Missing required field: ' + field });
    }
  }
  if (!body.termsAgreed) {
    return res.status(400).json({ error: 'Terms and Conditions must be agreed to.' });
  }
  if (!EMAIL_REGEX.test(body.email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!isAtLeast18(body.dateOfBirth)) {
    return res.status(400).json({ error: 'You must be at least 18 years old to register.' });
  }
  if (body.bringPlusOne === 'Yes') {
    for (const field of PLUS_ONE_FIELDS) {
      if (!body[field]) {
        return res.status(400).json({ error: 'Missing required plus-one field: ' + field });
      }
    }
    if (!EMAIL_REGEX.test(body.plusOneEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address for Plus One." });
    }
    if (!isAtLeast18(body.plusOneDateOfBirth)) {
      return res.status(400).json({ error: 'Plus One must be at least 18 years old.' });
    }
    const mainDigits = body.phoneNumber.replace(/[^0-9]/g, '');
    const plusOneDigits = body.plusOnePhoneNumber.replace(/[^0-9]/g, '');
    if (mainDigits === plusOneDigits) {
      return res.status(400).json({ error: "Plus One's phone number must be different from the attendee's phone number." });
    }
  }

  const bringingPlusOne = body.bringPlusOne === 'Yes';

  try {
    const pool = await getPool();

    const dupeCheck = pool.request();
    dupeCheck.input('eventName', sql.NVarChar(255), body.eventName);
    dupeCheck.input('email', sql.NVarChar(200), body.email);
    dupeCheck.input('plusOneEmail', sql.NVarChar(200), bringingPlusOne ? body.plusOneEmail : null);
    const dupeResult = await dupeCheck.query(
      'SELECT TOP 1 id FROM afterwork.EventRegistrations ' +
      'WHERE event_name = @eventName AND (' +
      '  mail = @email OR plus_one_mail = @email' +
      '  OR (@plusOneEmail IS NOT NULL AND mail = @plusOneEmail)' +
      '  OR (@plusOneEmail IS NOT NULL AND plus_one_mail = @plusOneEmail)' +
      ')'
    );
    if (dupeResult.recordset.length > 0) {
      return res.status(409).json({ error: 'One or both email addresses have already registered for this event.' });
    }

    const request = pool.request();

    request.input('eventName', sql.NVarChar(255), body.eventName);
    request.input('name', sql.NVarChar(200), body.name);
    request.input('email', sql.NVarChar(200), body.email);
    request.input('phoneNumber', sql.NVarChar(20), body.phoneNumber);
    request.input('dateOfBirth', sql.Date, body.dateOfBirth);
    request.input('organization', sql.NVarChar(200), body.organization);
    request.input('bringPlusOne', sql.VarChar(3), body.bringPlusOne);
    request.input('plusOneName', sql.NVarChar(200), bringingPlusOne ? body.plusOneName : null);
    request.input('plusOneEmail', sql.NVarChar(200), bringingPlusOne ? body.plusOneEmail : null);
    request.input('plusOnePhoneNumber', sql.NVarChar(20), bringingPlusOne ? body.plusOnePhoneNumber : null);
    request.input('plusOneDateOfBirth', sql.Date, bringingPlusOne ? body.plusOneDateOfBirth : null);
    request.input('plusOneOrganization', sql.NVarChar(200), bringingPlusOne ? body.plusOneOrganization : null);
    request.input('interest', sql.NVarChar(100), body.interest);
    request.input('termsAgreed', sql.Bit, body.termsAgreed ? 1 : 0);
    request.input('submittedAt', sql.DateTime2, nowInYangon());

    await request.query(
      'INSERT INTO afterwork.EventRegistrations ' +
      '(event_name, name, mail, phone_number, date_of_birth, organization, bring_plus_one, ' +
      ' plus_one_name, plus_one_mail, plus_one_phone_number, plus_one_date_of_birth, plus_one_organization, ' +
      ' interest, terms_agreed, submitted_at) ' +
      'VALUES ' +
      '(@eventName, @name, @email, @phoneNumber, @dateOfBirth, @organization, @bringPlusOne, ' +
      ' @plusOneName, @plusOneEmail, @plusOnePhoneNumber, @plusOneDateOfBirth, @plusOneOrganization, ' +
      ' @interest, @termsAgreed, @submittedAt)'
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Synapse insert failed:', err);
    return res.status(500).json({ error: 'Failed to save your registration. Please try again.' });
  }
};
