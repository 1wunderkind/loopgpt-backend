# Disaster Recovery Plan

**Project:** LoopGPT  
**Version:** 1.0  
**Last Updated:** December 2, 2024  
**Owner:** Operations Team

---

## Executive Summary

This Disaster Recovery (DR) Plan outlines procedures to restore LoopGPT services in the event of a disaster. The plan defines recovery objectives, procedures, and responsibilities.

### Recovery Objectives

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **Availability Target:** 99.9% (8.76 hours downtime/year)

---

## Disaster Scenarios

### 1. Database Failure

**Scenario:** Supabase database becomes unavailable or corrupted

**Impact:**
- All data access fails
- Orders cannot be processed
- Users cannot log in

**Recovery Procedure:**
1. Verify database status in Supabase Dashboard
2. Check Supabase status page: https://status.supabase.com
3. If Supabase outage: Wait for resolution (ETA from status page)
4. If database corruption:
   - Restore from latest backup (Supabase automatic backups)
   - Verify data integrity
   - Resume operations
5. Notify users of service restoration

**Recovery Time:** 1-2 hours  
**Data Loss:** < 1 hour (last backup)

---

### 2. Edge Function Failure

**Scenario:** Supabase Edge Functions become unavailable

**Impact:**
- API endpoints fail
- Orders cannot be placed
- Food search unavailable

**Recovery Procedure:**
1. Check Edge Functions status in Supabase Dashboard
2. Review error logs in Sentry
3. If deployment issue:
   - Rollback to previous version
   - Redeploy working version
4. If infrastructure issue:
   - Wait for Supabase resolution
   - Monitor status page
5. Verify all endpoints working
6. Notify users of service restoration

**Recovery Time:** 30 minutes - 2 hours  
**Data Loss:** None

---

### 3. Provider API Outage

**Scenario:** One or more provider APIs (Instacart, Shipt, etc.) become unavailable

**Impact:**
- Reduced provider options
- Some orders may fail
- Automatic fallback to other providers

**Recovery Procedure:**
1. Monitor provider status
2. Verify automatic fallback working
3. If all providers down:
   - Display maintenance message
   - Queue orders for later processing
4. When provider restored:
   - Process queued orders
   - Resume normal operations
5. Notify affected users

**Recovery Time:** Depends on provider  
**Data Loss:** None (orders queued)

---

### 4. Complete Service Outage

**Scenario:** All LoopGPT services become unavailable

**Impact:**
- Complete service unavailability
- No user access
- No order processing

**Recovery Procedure:**
1. Assess scope of outage
2. Check all infrastructure components:
   - Supabase (database + edge functions)
   - DNS
   - CDN
3. Identify root cause
4. Execute recovery based on cause:
   - Database: Restore from backup
   - Edge Functions: Redeploy
   - DNS: Update records
   - CDN: Clear cache / reconfigure
5. Verify all services operational
6. Conduct post-mortem
7. Notify all users

**Recovery Time:** 2-4 hours  
**Data Loss:** < 1 hour

---

### 5. Data Breach

**Scenario:** Unauthorized access to user data

**Impact:**
- User data compromised
- Legal/compliance implications
- Reputation damage

**Recovery Procedure:**
1. **Immediate (0-1 hour):**
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable additional security measures
   - Assess scope of breach

2. **Short-term (1-24 hours):**
   - Contain breach
   - Preserve evidence
   - Notify security team
   - Begin investigation

3. **Medium-term (1-3 days):**
   - Notify affected users (GDPR: 72 hours)
   - Notify authorities if required
   - Implement fixes
   - Conduct security audit

4. **Long-term (3-30 days):**
   - Complete investigation
   - Implement additional security measures
   - Conduct post-mortem
   - Update security policies

**Recovery Time:** 1-7 days  
**Data Loss:** Depends on breach scope

---

## Backup Strategy

### Database Backups

**Supabase Automatic Backups:**
- Frequency: Daily
- Retention: 7 days (free tier) / 30 days (pro tier)
- Type: Full database backup
- Location: Supabase infrastructure

**Manual Backups:**
- Frequency: Before major changes
- Retention: 90 days
- Type: Database dump
- Location: External storage (S3)

**Backup Verification:**
- Test restore: Monthly
- Verify integrity: Weekly
- Document results: All tests

### Code Backups

**Git Repository:**
- Frequency: Every commit
- Retention: Unlimited
- Location: GitHub
- Branches: main, develop, feature/*

**Deployment Backups:**
- Frequency: Every deployment
- Retention: Last 10 deployments
- Location: Supabase

### Configuration Backups

**Environment Variables:**
- Frequency: On change
- Retention: Version controlled
- Location: Secure vault + Git (encrypted)

**Infrastructure Config:**
- Frequency: On change
- Retention: Version controlled
- Location: Git repository

---

## Recovery Procedures

### Database Recovery

**Restore from Supabase Backup:**

```bash
# 1. Access Supabase Dashboard
# 2. Navigate to Database → Backups
# 3. Select backup to restore
# 4. Click "Restore"
# 5. Confirm restoration
# 6. Wait for completion (5-30 minutes)
# 7. Verify data integrity
```

**Restore from Manual Backup:**

```bash
# 1. Download backup file from S3
aws s3 cp s3://loopgpt-backups/db_backup_YYYYMMDD.sql.gz .

# 2. Decompress backup
gunzip db_backup_YYYYMMDD.sql.gz

# 3. Restore to database
psql -h db.xxx.supabase.co -U postgres -d postgres < db_backup_YYYYMMDD.sql

# 4. Verify data integrity
psql -h db.xxx.supabase.co -U postgres -d postgres -c "SELECT COUNT(*) FROM users;"

# 5. Resume operations
```

### Edge Function Recovery

**Rollback to Previous Version:**

```bash
# 1. List recent deployments
supabase functions list --project-ref xxx

# 2. Identify working version
# 3. Redeploy previous version
supabase functions deploy --project-ref xxx --version PREVIOUS_VERSION

# 4. Verify deployment
curl https://xxx.supabase.co/functions/v1/health

# 5. Monitor for errors
```

**Deploy from Backup:**

```bash
# 1. Clone repository
git clone https://github.com/loopgpt/backend.git

# 2. Checkout working version
git checkout WORKING_COMMIT_HASH

# 3. Deploy functions
supabase functions deploy --project-ref xxx

# 4. Verify deployment
```

---

## Communication Plan

### Internal Communication

**Incident Notification:**
1. Slack: #incidents channel
2. Email: ops@loopgpt.ai
3. Phone: On-call engineer

**Status Updates:**
- Frequency: Every 30 minutes during incident
- Channel: Slack #incidents
- Content: Current status, ETA, actions taken

### External Communication

**User Notification:**
1. Status page: status.loopgpt.ai
2. Email: All affected users
3. In-app: Banner notification
4. Social media: Twitter, etc.

**Status Page Updates:**
- Incident detected: Within 5 minutes
- Investigation update: Every 30 minutes
- Resolution: Within 5 minutes

**Email Templates:**

**Incident Notification:**
```
Subject: LoopGPT Service Issue - [DATE]

Dear LoopGPT User,

We are currently experiencing technical difficulties with our service. Our team is actively working to resolve the issue.

Current Status: [STATUS]
Estimated Resolution: [ETA]
Affected Services: [SERVICES]

We apologize for any inconvenience and will provide updates as we work to restore full service.

Thank you for your patience.

The LoopGPT Team
```

**Resolution Notification:**
```
Subject: LoopGPT Service Restored - [DATE]

Dear LoopGPT User,

We are pleased to inform you that the service issue has been resolved. All systems are now operating normally.

Incident Duration: [DURATION]
Root Cause: [BRIEF EXPLANATION]
Preventive Measures: [ACTIONS TAKEN]

We sincerely apologize for any inconvenience this may have caused.

Thank you for your patience and continued support.

The LoopGPT Team
```

---

## Roles and Responsibilities

### Incident Commander
- Declare disaster
- Coordinate recovery efforts
- Make critical decisions
- Communicate with stakeholders

### Technical Lead
- Assess technical impact
- Execute recovery procedures
- Verify system restoration
- Document technical details

### Communications Lead
- Update status page
- Send user notifications
- Handle media inquiries
- Coordinate internal communication

### Support Lead
- Monitor support channels
- Respond to user inquiries
- Escalate critical issues
- Track user impact

---

## Testing and Maintenance

### DR Plan Testing

**Frequency:** Quarterly

**Test Scenarios:**
1. Database restore test
2. Edge function rollback test
3. Complete service recovery test
4. Communication plan test

**Test Procedure:**
1. Schedule test (non-peak hours)
2. Execute test scenario
3. Document results
4. Identify improvements
5. Update DR plan

### Plan Maintenance

**Review Schedule:**
- Quarterly: Full plan review
- After incidents: Update based on lessons learned
- After major changes: Update affected procedures

**Update Process:**
1. Identify changes needed
2. Draft updates
3. Review with team
4. Approve changes
5. Publish updated plan
6. Train team on changes

---

## Post-Incident Procedures

### Post-Mortem

**Timeline:** Within 48 hours of incident resolution

**Participants:**
- Incident Commander
- Technical Lead
- All involved team members

**Agenda:**
1. Incident timeline
2. Root cause analysis
3. Impact assessment
4. Response evaluation
5. Lessons learned
6. Action items

**Deliverables:**
- Post-mortem report
- Action items with owners and deadlines
- DR plan updates

### Continuous Improvement

**Action Items:**
- Assign owners
- Set deadlines
- Track progress
- Verify completion

**DR Plan Updates:**
- Incorporate lessons learned
- Update procedures
- Add new scenarios
- Improve documentation

---

## Appendix

### A. Contact Information

**On-Call Rotation:**
- Primary: [Name] - [Phone]
- Secondary: [Name] - [Phone]
- Escalation: [Name] - [Phone]

**External Contacts:**
- Supabase Support: support@supabase.io
- Provider Support: [Contact info]

### B. System Access

**Supabase Dashboard:**
- URL: https://supabase.com/dashboard
- Project: qmagnwxeijctkksqbcqz

**GitHub Repository:**
- URL: https://github.com/loopgpt/backend
- Access: Team members

**AWS S3 (Backups):**
- Bucket: loopgpt-backups
- Region: us-east-1

### C. Runbooks

**Database Restore Runbook:** See Database Recovery section  
**Edge Function Rollback Runbook:** See Edge Function Recovery section  
**Provider Failover Runbook:** See Provider API Outage section

---

**Plan Status:** ACTIVE  
**Next Review:** March 2, 2025  
**Version:** 1.0
