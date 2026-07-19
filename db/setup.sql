-- ============================================================
-- AFTERWORK by Heineken — Synapse Dedicated SQL Pool setup
-- Run each section in Synapse Studio (or another SQL client)
-- connected as an Azure AD admin on the workspace.
-- ============================================================

-- 1. Run in the target DEDICATED POOL DATABASE: create the table.
--    (This is your exact table definition.)
IF OBJECT_ID('afterwork.EventRegistrations', 'U') IS NOT NULL
    DROP TABLE afterwork.EventRegistrations;
GO

CREATE TABLE afterwork.EventRegistrations
(
    id                     INT IDENTITY(1,1) NOT NULL,

    -- Hidden value supplied by the microsite
    event_name             NVARCHAR(255) NOT NULL,

    -- Main attendee
    name                   NVARCHAR(200) NOT NULL,
    mail                   NVARCHAR(200) NOT NULL,
    phone_number           NVARCHAR(20) NOT NULL,
    date_of_birth          DATE NOT NULL,
    organization           NVARCHAR(200) NOT NULL,

    -- Plus one information
    bring_plus_one         VARCHAR(3) NOT NULL,
    plus_one_name          NVARCHAR(200) NULL,
    plus_one_mail          NVARCHAR(200) NULL,
    plus_one_phone_number  NVARCHAR(20) NULL,
    plus_one_date_of_birth DATE NULL,
    plus_one_organization  NVARCHAR(200) NULL,

    -- Interest selection
    interest               NVARCHAR(100) NOT NULL,

    -- Terms & Conditions
    terms_agreed           BIT NOT NULL,

    -- Yangon Date Time supplied by app on submit
    submitted_at           DATETIME2 NOT NULL
)
WITH
(
    DISTRIBUTION = ROUND_ROBIN,
    HEAP
);
GO

-- 2. Run in the MASTER database of the SQL server/workspace:
--    create a login for the app registration. Replace the name
--    below with your app registration's exact display name in Azure AD.
-- CREATE LOGIN [your-app-registration-display-name] FROM EXTERNAL PROVIDER;

-- 3. Back in the target DEDICATED POOL DATABASE: create a user
--    mapped to that login, and grant it INSERT rights on the table.
-- CREATE USER [your-app-registration-display-name] FOR LOGIN [your-app-registration-display-name];
-- GRANT INSERT ON afterwork.EventRegistrations TO [your-app-registration-display-name];

-- ============================================================
-- Migration: adding the "Mail" field to a table that already exists
-- in production (skip this if you're running the CREATE TABLE above
-- fresh — it already includes these columns).
--
-- Added as NULLable since existing rows have no value for them. If you
-- want them NOT NULL going forward, backfill existing rows first, then
-- run: ALTER TABLE afterwork.EventRegistrations ALTER COLUMN mail NVARCHAR(200) NOT NULL;
-- ============================================================
-- ALTER TABLE afterwork.EventRegistrations ADD mail NVARCHAR(200) NULL;
-- ALTER TABLE afterwork.EventRegistrations ADD plus_one_mail NVARCHAR(200) NULL;
