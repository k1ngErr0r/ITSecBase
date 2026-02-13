-- +goose Up

-- Default organisation
INSERT INTO organisations (id, name, slug) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Default Organisation', 'default');

-- Default admin user (password: 'Admin123!', argon2id hash)
-- To generate a new hash, use the auth.HashPassword() function in the API
INSERT INTO users (id, org_id, email, password_hash, display_name, job_title, status) VALUES
    ('b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',
     'admin@secbase.local',
     '$argon2id$v=19$m=65536,t=1,p=4$c2VjYmFzZXNhbHQxMjM0$K8H1yqWMZEDBLaXPsVPdiH4VxLuL5YX3KeN9tnEgjWk',
     'System Administrator',
     'InfoSec Manager',
     'active');

-- Default groups
INSERT INTO groups (id, org_id, name, description, permissions) VALUES
    ('c0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',
     'InfoSec Manager',
     'Full access to all security management features',
     '["vulnerabilities:*","assets:*","risks:*","incidents:*","dr_plans:*","iso_controls:*","dashboard:*","admin:read"]'),
    ('c0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000001',
     'Security Analyst',
     'Can create and manage vulnerabilities, assets, and incidents',
     '["vulnerabilities:*","assets:*","risks:read","incidents:*","dr_plans:read","iso_controls:read","dashboard:read"]'),
    ('c0000000-0000-0000-0000-000000000003',
     'a0000000-0000-0000-0000-000000000001',
     'Viewer',
     'Read-only access to all security data',
     '["vulnerabilities:read","assets:read","risks:read","incidents:read","dr_plans:read","iso_controls:read","dashboard:read"]'),
    ('c0000000-0000-0000-0000-000000000004',
     'a0000000-0000-0000-0000-000000000001',
     'Admin',
     'Full system administration access',
     '["*"]');

-- Assign admin user to Admin group
INSERT INTO user_groups (user_id, group_id) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004');

-- Default risk matrix config
INSERT INTO risk_matrix_config (org_id, likelihood_labels, impact_labels, level_thresholds) VALUES
    ('a0000000-0000-0000-0000-000000000001',
     '["Rare","Unlikely","Possible","Likely","Almost Certain"]',
     '["Negligible","Minor","Moderate","Major","Severe"]',
     '{"low":{"min":1,"max":4},"medium":{"min":5,"max":9},"high":{"min":10,"max":14},"critical":{"min":15,"max":25}}');

-- ISO 27001:2022 Annex A Controls (93 controls)
-- Theme: Organisational (37 controls, A.5.x - A.5.37)
INSERT INTO iso_controls (control_id, name, theme, description) VALUES
    ('A.5.1',  'Policies for information security',             'organisational', 'Define and approve information security policies'),
    ('A.5.2',  'Information security roles and responsibilities','organisational', 'Define and allocate information security roles'),
    ('A.5.3',  'Segregation of duties',                         'organisational', 'Conflicting duties shall be segregated'),
    ('A.5.4',  'Management responsibilities',                   'organisational', 'Management shall require personnel to apply information security'),
    ('A.5.5',  'Contact with authorities',                      'organisational', 'Establish and maintain contact with relevant authorities'),
    ('A.5.6',  'Contact with special interest groups',           'organisational', 'Establish and maintain contact with special interest groups'),
    ('A.5.7',  'Threat intelligence',                           'organisational', 'Collect and analyse information about information security threats'),
    ('A.5.8',  'Information security in project management',     'organisational', 'Integrate information security into project management'),
    ('A.5.9',  'Inventory of information and other assets',      'organisational', 'Develop and maintain an inventory of information assets'),
    ('A.5.10', 'Acceptable use of information and other assets', 'organisational', 'Rules for acceptable use shall be identified and documented'),
    ('A.5.11', 'Return of assets',                              'organisational', 'Personnel shall return all assets upon termination'),
    ('A.5.12', 'Classification of information',                  'organisational', 'Information shall be classified according to needs'),
    ('A.5.13', 'Labelling of information',                       'organisational', 'Appropriate set of procedures for labelling shall be developed'),
    ('A.5.14', 'Information transfer',                           'organisational', 'Rules, procedures and agreements for information transfer'),
    ('A.5.15', 'Access control',                                'organisational', 'Rules to control logical and physical access'),
    ('A.5.16', 'Identity management',                           'organisational', 'Full lifecycle of identities shall be managed'),
    ('A.5.17', 'Authentication information',                     'organisational', 'Allocation and management of authentication information'),
    ('A.5.18', 'Access rights',                                 'organisational', 'Access rights shall be provisioned, reviewed and revoked'),
    ('A.5.19', 'Information security in supplier relationships', 'organisational', 'Processes for managing security risks from suppliers'),
    ('A.5.20', 'Addressing information security within supplier agreements', 'organisational', 'Relevant security requirements in supplier agreements'),
    ('A.5.21', 'Managing information security in the ICT supply chain', 'organisational', 'Processes for managing security risks in ICT supply chain'),
    ('A.5.22', 'Monitoring, review and change management of supplier services', 'organisational', 'Monitor, review and manage changes in supplier services'),
    ('A.5.23', 'Information security for use of cloud services', 'organisational', 'Processes for acquisition and management of cloud services'),
    ('A.5.24', 'Information security incident management planning and preparation', 'organisational', 'Plan and prepare for information security incident management'),
    ('A.5.25', 'Assessment and decision on information security events', 'organisational', 'Assess security events and decide if they are incidents'),
    ('A.5.26', 'Response to information security incidents',     'organisational', 'Information security incidents shall be responded to'),
    ('A.5.27', 'Learning from information security incidents',   'organisational', 'Knowledge gained from incidents shall be used to strengthen controls'),
    ('A.5.28', 'Collection of evidence',                        'organisational', 'Procedures for identification and collection of evidence'),
    ('A.5.29', 'Information security during disruption',         'organisational', 'Plan how to maintain security during disruption'),
    ('A.5.30', 'ICT readiness for business continuity',          'organisational', 'ICT readiness shall be planned and implemented'),
    ('A.5.31', 'Legal, statutory, regulatory and contractual requirements', 'organisational', 'Identify and document legal and regulatory requirements'),
    ('A.5.32', 'Intellectual property rights',                   'organisational', 'Procedures to protect intellectual property rights'),
    ('A.5.33', 'Protection of records',                         'organisational', 'Records shall be protected from loss and destruction'),
    ('A.5.34', 'Privacy and protection of PII',                 'organisational', 'Privacy and PII protection as required by law'),
    ('A.5.35', 'Independent review of information security',     'organisational', 'Independent review of information security approach'),
    ('A.5.36', 'Compliance with policies, rules and standards',  'organisational', 'Compliance with policies and standards shall be reviewed'),
    ('A.5.37', 'Documented operating procedures',               'organisational', 'Operating procedures shall be documented and made available');

-- Theme: People (8 controls, A.6.x)
INSERT INTO iso_controls (control_id, name, theme, description) VALUES
    ('A.6.1', 'Screening',                                     'people', 'Background verification checks on candidates'),
    ('A.6.2', 'Terms and conditions of employment',             'people', 'Employment agreements shall state security responsibilities'),
    ('A.6.3', 'Information security awareness, education and training', 'people', 'Personnel shall receive appropriate security awareness training'),
    ('A.6.4', 'Disciplinary process',                           'people', 'Disciplinary process for security policy violations'),
    ('A.6.5', 'Responsibilities after termination or change of employment', 'people', 'Security responsibilities that remain valid after termination'),
    ('A.6.6', 'Confidentiality or non-disclosure agreements',   'people', 'Confidentiality agreements shall reflect security needs'),
    ('A.6.7', 'Remote working',                                 'people', 'Security measures for remote working'),
    ('A.6.8', 'Information security event reporting',            'people', 'Mechanism for personnel to report security events');

-- Theme: Physical (14 controls, A.7.x)
INSERT INTO iso_controls (control_id, name, theme, description) VALUES
    ('A.7.1',  'Physical security perimeters',                  'physical', 'Security perimeters shall be defined and used'),
    ('A.7.2',  'Physical entry',                                'physical', 'Secure areas shall be protected by entry controls'),
    ('A.7.3',  'Securing offices, rooms and facilities',         'physical', 'Physical security for offices, rooms and facilities'),
    ('A.7.4',  'Physical security monitoring',                   'physical', 'Premises shall be continuously monitored for unauthorized access'),
    ('A.7.5',  'Protecting against physical and environmental threats', 'physical', 'Protection against physical and environmental threats'),
    ('A.7.6',  'Working in secure areas',                       'physical', 'Security measures for working in secure areas'),
    ('A.7.7',  'Clear desk and clear screen',                   'physical', 'Clear desk rules for papers and clear screen for facilities'),
    ('A.7.8',  'Equipment siting and protection',               'physical', 'Equipment shall be sited securely and protected'),
    ('A.7.9',  'Security of assets off-premises',               'physical', 'Off-site assets shall be protected'),
    ('A.7.10', 'Storage media',                                 'physical', 'Storage media shall be managed through lifecycle'),
    ('A.7.11', 'Supporting utilities',                          'physical', 'Facilities shall be protected from power failures'),
    ('A.7.12', 'Cabling security',                              'physical', 'Cables shall be protected from interception or damage'),
    ('A.7.13', 'Equipment maintenance',                          'physical', 'Equipment shall be maintained correctly'),
    ('A.7.14', 'Secure disposal or re-use of equipment',        'physical', 'Items of equipment shall be verified prior to disposal');

-- Theme: Technological (34 controls, A.8.x)
INSERT INTO iso_controls (control_id, name, theme, description) VALUES
    ('A.8.1',  'User endpoint devices',                         'technological', 'Information stored on or processed by user endpoint devices'),
    ('A.8.2',  'Privileged access rights',                      'technological', 'Allocation and use of privileged access rights shall be restricted'),
    ('A.8.3',  'Information access restriction',                 'technological', 'Access to information shall be restricted in accordance with policy'),
    ('A.8.4',  'Access to source code',                         'technological', 'Read and write access to source code shall be managed'),
    ('A.8.5',  'Secure authentication',                         'technological', 'Secure authentication technologies and procedures'),
    ('A.8.6',  'Capacity management',                           'technological', 'Use of resources shall be monitored and adjusted'),
    ('A.8.7',  'Protection against malware',                    'technological', 'Protection against malware shall be implemented'),
    ('A.8.8',  'Management of technical vulnerabilities',        'technological', 'Information about technical vulnerabilities shall be obtained'),
    ('A.8.9',  'Configuration management',                       'technological', 'Configurations shall be established, documented and monitored'),
    ('A.8.10', 'Information deletion',                          'technological', 'Information stored in systems shall be deleted when no longer required'),
    ('A.8.11', 'Data masking',                                  'technological', 'Data masking shall be used in accordance with access policy'),
    ('A.8.12', 'Data leakage prevention',                       'technological', 'Data leakage prevention measures shall be applied'),
    ('A.8.13', 'Information backup',                            'technological', 'Backup copies shall be maintained and regularly tested'),
    ('A.8.14', 'Redundancy of information processing facilities','technological', 'Information processing facilities with sufficient redundancy'),
    ('A.8.15', 'Logging',                                       'technological', 'Logs recording activities shall be produced and protected'),
    ('A.8.16', 'Monitoring activities',                         'technological', 'Networks, systems and applications shall be monitored'),
    ('A.8.17', 'Clock synchronisation',                          'technological', 'Clocks of information processing systems shall be synchronised'),
    ('A.8.18', 'Use of privileged utility programs',            'technological', 'Use of utility programs shall be restricted and controlled'),
    ('A.8.19', 'Installation of software on operational systems','technological', 'Procedures to control installation of software'),
    ('A.8.20', 'Networks security',                             'technological', 'Networks and network devices shall be secured and managed'),
    ('A.8.21', 'Security of network services',                  'technological', 'Security mechanisms and service levels for network services'),
    ('A.8.22', 'Segregation of networks',                       'technological', 'Groups of information services shall be segregated'),
    ('A.8.23', 'Web filtering',                                 'technological', 'Access to external websites shall be managed to reduce exposure'),
    ('A.8.24', 'Use of cryptography',                           'technological', 'Rules for effective use of cryptography shall be defined'),
    ('A.8.25', 'Secure development life cycle',                 'technological', 'Rules for secure development of software and systems'),
    ('A.8.26', 'Application security requirements',             'technological', 'Information security requirements for applications'),
    ('A.8.27', 'Secure system architecture and engineering principles', 'technological', 'Principles for engineering secure systems'),
    ('A.8.28', 'Secure coding',                                 'technological', 'Secure coding principles shall be applied to development'),
    ('A.8.29', 'Security testing in development and acceptance', 'technological', 'Security testing processes shall be defined'),
    ('A.8.30', 'Outsourced development',                        'technological', 'Organisation shall direct and monitor outsourced development'),
    ('A.8.31', 'Separation of development, test and production environments', 'technological', 'Development, testing and production environments shall be separated'),
    ('A.8.32', 'Change management',                             'technological', 'Changes to information processing facilities shall be controlled'),
    ('A.8.33', 'Test information',                              'technological', 'Test information shall be appropriately selected and protected'),
    ('A.8.34', 'Protection of information systems during audit testing', 'technological', 'Audit tests shall be planned and agreed');

-- +goose Down

DELETE FROM user_groups WHERE user_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM risk_matrix_config WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM groups WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE org_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM organisations WHERE id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM iso_controls WHERE is_reference = true;
