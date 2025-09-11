// Baseline Intake Schema (bilingual)
// Defines Core (C1–C18) and conditional branches A/K/D/P/G/M

export type LangText = { en: string; de: string }

export type FieldType =
  | 'long_text'
  | 'text'
  | 'number'
  | 'date'
  | 'select_single'
  | 'checkboxes'
  | 'date_list'
  | 'text_list'
  | 'multi'

export type Option = { value: string; label: LangText }

export type Field = {
  id: string
  label: LangText
  type: FieldType
  hint?: LangText
  options?: Option[] // for select_single, checkboxes
  fields?: Field[] // for multi
}

export type Section = {
  key: 'core' | 'alcohol' | 'cannabis' | 'drugs' | 'points' | 'aggression' | 'medical'
  title: LangText
  items: Field[]
}

export const sections: Section[] = [
  {
    key: 'core',
    title: { en: 'Core (asked to everyone)', de: 'Kern (für alle)' },
    items: [
      {
        id: 'C1_incident_summary',
        label: {
          en: 'What happened? Summarize the incident(s) in your own words (what, when, where, who, consequences).',
          de: 'Was ist passiert? Beschreiben Sie den/die Vorfall/Vorfälle (was, wann, wo, wer, Folgen).',
        },
        type: 'long_text',
      },
      {
        id: 'C2_official_case_data',
        label: {
          en: 'Official case data',
          de: 'Offizielle Falldaten',
        },
        type: 'multi',
        fields: [
          { id: 'C2_dates', label: { en: 'Date(s) of incident(s)', de: 'Datum/Daten der Vorfälle' }, type: 'date_list' },
          {
            id: 'C2_violation_types',
            label: { en: 'Violation type(s)', de: 'Tatbestand/Verstoßart' },
            type: 'checkboxes',
            options: [
              { value: 'alcohol', label: { en: 'Alcohol', de: 'Alkohol' } },
              { value: 'cannabis', label: { en: 'Cannabis', de: 'Cannabis' } },
              { value: 'drugs', label: { en: 'Other drugs / meds', de: 'Andere Drogen/Medikamente' } },
              { value: 'points', label: { en: 'Points / repeated violations', de: 'Punkte / wiederholte Verstöße' } },
              { value: 'aggression', label: { en: 'Aggression / violence', de: 'Aggression / Gewalt' } },
              { value: 'medical', label: { en: 'Medical / neurological', de: 'Medizinisch / neurologisch' } },
              { value: 'other', label: { en: 'Other', de: 'Sonstiges' } },
            ],
          },
          { id: 'C2_measurements', label: { en: 'Measurements (BAC/THC etc.)', de: 'Messwerte (BAK/THC etc.)' }, type: 'text' },
          { id: 'C2_police_notes', label: { en: 'Police notes', de: 'Polizeivermerk' }, type: 'text' },
          { id: 'C2_case_number', label: { en: 'Case number', de: 'Aktenzeichen' }, type: 'text' },
        ],
      },
      {
        id: 'C3_license_history',
        label: { en: 'License history', de: 'Fahrerlaubnishistorie' },
        type: 'multi',
        fields: [
          {
            id: 'C3_status',
            label: { en: 'Status now', de: 'Aktueller Status' },
            type: 'select_single',
            options: [
              { value: 'revoked', label: { en: 'Revoked', de: 'Entzogen' } },
              { value: 'suspended', label: { en: 'Suspended', de: 'Ruhend' } },
              { value: 'valid', label: { en: 'Valid', de: 'Gültig' } },
            ],
          },
          { id: 'C3_prev_withdrawals_count', label: { en: 'Previous withdrawals (count)', de: 'Frühere Entziehungen (Anzahl)' }, type: 'number' },
          { id: 'C3_prev_withdrawal_dates', label: { en: 'Previous withdrawals (dates)', de: 'Frühere Entziehungen (Daten)' }, type: 'date_list' },
          { id: 'C3_deadlines', label: { en: 'Current deadlines', de: 'Aktuelle Fristen' }, type: 'text' },
        ],
      },
      {
        id: 'C4_responsibility',
        label: { en: 'Responsibility (0–10) and why', de: 'Verantwortung (0–10) und warum' },
        type: 'multi',
        fields: [
          { id: 'C4_rating', label: { en: 'Rating (0–10)', de: 'Wert (0–10)' }, type: 'number' },
          { id: 'C4_why', label: { en: 'Why?', de: 'Warum?' }, type: 'long_text' },
        ],
      },
      {
        id: 'C5_pattern_before',
        label: { en: 'Pattern before incident', de: 'Muster vor dem Vorfall' },
        type: 'multi',
        fields: [
          {
            id: 'C5_checkboxes',
            label: { en: 'Typical routines', de: 'Typische Muster' },
            type: 'checkboxes',
            options: [
              { value: 'weekend_partying', label: { en: 'Weekend partying', de: 'Wochenendfeiern' } },
              { value: 'work_stress', label: { en: 'Stress after work', de: 'Stress nach der Arbeit' } },
              { value: 'drive_after_little', label: { en: 'Driving after “just a little”', de: '„Nur wenig“ und trotzdem fahren' } },
              { value: 'morning_after', label: { en: 'Morning after driving', de: 'Fahren am Morgen danach' } },
              { value: 'other', label: { en: 'Other', de: 'Sonstiges' } },
            ],
          },
          { id: 'C5_text', label: { en: 'Details', de: 'Details' }, type: 'long_text' },
        ],
      },
      { id: 'C6_since_incident', label: { en: 'Since the incident, what changed?', de: 'Was hat sich seit dem Vorfall geändert?' }, type: 'long_text' },
      {
        id: 'C7_current_stance',
        label: { en: 'Current stance', de: 'Aktuelle Haltung' },
        type: 'select_single',
        options: [
          { value: 'abstinence', label: { en: 'Abstinence', de: 'Abstinenz' } },
          { value: 'controlled', label: { en: 'Controlled use', de: 'Kontrollierter Konsum' } },
          { value: 'no_use_uncommitted', label: { en: 'No use, not committed', de: 'Kein Konsum, aber ohne Festlegung' } },
          { value: 'no_change', label: { en: 'No change', de: 'Keine Änderung' } },
        ],
      },
      {
        id: 'C8_evidence',
        label: { en: 'Evidence available', de: 'Vorliegende Nachweise' },
        type: 'multi',
        fields: [
          {
            id: 'C8_checkboxes',
            label: { en: 'Proofs', de: 'Nachweise' },
            type: 'checkboxes',
            options: [
              { value: 'ctu_urine_hair', label: { en: 'Urine/Hair per CTU', de: 'Urin/Haar nach CTU' } },
              { value: 'therapy_letters', label: { en: 'Therapy letters', de: 'Therapiebriefe' } },
              { value: 'medical_certificates', label: { en: 'Medical certificates', de: 'Ärztliche Atteste' } },
              { value: 'attendance', label: { en: 'Certificates of attendance', de: 'Teilnahmebescheinigungen' } },
            ],
          },
          { id: 'C8_uploads', label: { en: 'Upload links / references', de: 'Upload-Links / Referenzen' }, type: 'text_list' },
        ],
      },
      { id: 'C9_support_network', label: { en: 'Who supports you? How?', de: 'Wer unterstützt Sie? Wie?' }, type: 'long_text' },
      { id: 'C10_risk_situations', label: { en: 'Risk situations & strategies', de: 'Risikosituationen & Strategien' }, type: 'long_text' },
      { id: 'C11_relapse_signs', label: { en: 'Relapse early‑warning signs & plan', de: 'Frühwarnzeichen & Plan' }, type: 'long_text' },
      {
        id: 'C12_motivation',
        label: { en: 'Motivation and confidence', de: 'Motivation und Zuversicht' },
        type: 'multi',
        fields: [
          { id: 'C12_confidence', label: { en: 'Confidence (0–10)', de: 'Zuversicht (0–10)' }, type: 'number' },
          { id: 'C12_why', label: { en: 'Why change now?', de: 'Warum jetzt ändern?' }, type: 'long_text' },
        ],
      },
      { id: 'C13_work_logistics', label: { en: 'Work & logistics', de: 'Arbeit & Logistik' }, type: 'long_text' },
      {
        id: 'C14_health_medication',
        label: { en: 'Health & medication snapshot', de: 'Gesundheit & Medikamente (Überblick)' },
        type: 'multi',
        fields: [
          { id: 'C14_diagnoses', label: { en: 'Relevant diagnoses', de: 'Relevante Diagnosen' }, type: 'text' },
          { id: 'C14_meds', label: { en: 'Meds affecting alertness', de: 'Verkehrsrelevante Medikamente' }, type: 'text' },
          { id: 'C14_doctor_instructions', label: { en: 'Driving instructions from doctor', de: 'Hinweise vom Arzt fürs Fahren' }, type: 'text' },
        ],
      },
      { id: 'C15_previous_counseling', label: { en: 'Previous counseling/training', de: 'Bisherige Beratung/Training' }, type: 'long_text' },
      {
        id: 'C16_knowledge_self_check',
        label: { en: 'Knowledge self‑check', de: 'Wissens‑Selbstcheck' },
        type: 'select_single',
        options: [
          { value: 'basic', label: { en: 'Basic', de: 'Basis' } },
          { value: 'medium', label: { en: 'Medium', de: 'Mittel' } },
          { value: 'strong', label: { en: 'Strong', de: 'Gut' } },
        ],
      },
      { id: 'C17_upcoming_dates', label: { en: 'Upcoming dates', de: 'Anstehende Termine' }, type: 'multi', fields: [
        { id: 'C17_hearing_dates', label: { en: 'Hearing dates', de: 'Anhörungstermine' }, type: 'date_list' },
        { id: 'C17_mpu_target', label: { en: 'MPU target month', de: 'MPU Zielmonat' }, type: 'date' },
        { id: 'C17_abstinence_start', label: { en: 'Abstinence program start', de: 'Start Abstinenzprogramm' }, type: 'date' },
      ] },
      { id: 'C18_consent', label: { en: 'Consent & data use (acknowledgement)', de: 'Einwilligung & Datennutzung (Bestätigung)' }, type: 'long_text' },
    ],
  },
  {
    key: 'alcohol',
    title: { en: 'Branch: Alcohol', de: 'Zweig: Alkohol' },
    items: [
      { id: 'A1_weekly_units', label: { en: 'Average weekly alcohol units (and context)', de: 'Durchschnittliche Wochenmenge (und Kontext)' }, type: 'multi', fields: [
        { id: 'A1_units', label: { en: 'Units/week (approx.)', de: 'Einheiten/Woche (ca.)' }, type: 'number' },
        { id: 'A1_contexts', label: { en: 'Typical contexts', de: 'Typische Situationen' }, type: 'text' },
        { id: 'A1_heavy_frequency', label: { en: 'Heavy episode frequency', de: 'Häufigkeit starker Episoden' }, type: 'select_single', options: [
          { value: 'never', label: { en: 'Never', de: 'Nie' } },
          { value: 'rarely', label: { en: 'Rarely', de: 'Selten' } },
          { value: 'monthly', label: { en: 'Monthly', de: 'Monatlich' } },
          { value: 'weekly', label: { en: 'Weekly', de: 'Wöchentlich' } },
          { value: 'daily', label: { en: 'Daily', de: 'Täglich' } },
        ] },
      ] },
      { id: 'A2_day_of_offense', label: { en: 'Day‑of‑offense details', de: 'Details am Tattag' }, type: 'multi', fields: [
        { id: 'A2_type_amount', label: { en: 'Type/Amount', de: 'Art/Menge' }, type: 'text' },
        { id: 'A2_last_drink_time', label: { en: 'Last drink time', de: 'Letzte Trinkzeit' }, type: 'text' },
        { id: 'A2_food', label: { en: 'Food', de: 'Essen' }, type: 'text' },
        { id: 'A2_timeline_to_driving', label: { en: 'Timeline to driving', de: 'Zeitachse bis zum Fahren' }, type: 'text' },
        { id: 'A2_fitness_feeling', label: { en: 'Feeling of fitness', de: 'Gefühl der Fahrtüchtigkeit' }, type: 'text' },
      ] },
      { id: 'A3_highest_bac', label: { en: 'Highest recorded BAC (‰)', de: 'Höchste bekannte BAK (‰)' }, type: 'number' },
      { id: 'A4_change_since_when', label: { en: 'Since when changed & what exactly changed', de: 'Seit wann geändert & was genau' }, type: 'multi', fields: [
        { id: 'A4_since', label: { en: 'Since (date)', de: 'Seit (Datum)' }, type: 'date' },
        { id: 'A4_what', label: { en: 'What changed', de: 'Was geändert' }, type: 'long_text' },
      ] },
      { id: 'A5_plan', label: { en: 'Abstinence or controlled use plan', de: 'Abstinenz oder kontrollierter Konsum (Plan)' }, type: 'multi', fields: [
        { id: 'A5_choice', label: { en: 'Choice', de: 'Wahl' }, type: 'select_single', options: [
          { value: 'abstinence', label: { en: 'Abstinence', de: 'Abstinenz' } },
          { value: 'controlled', label: { en: 'Controlled use', de: 'Kontrollierter Konsum' } },
        ] },
        { id: 'A5_rules', label: { en: 'If controlled: concrete rules', de: 'Bei Kontrolle: konkrete Regeln' }, type: 'long_text' },
      ] },
      { id: 'A6_proofs', label: { en: 'Proofs (EtG, lab/provider, goal duration)', de: 'Nachweise (EtG, Labor/Anbieter, Zieldauer)' }, type: 'multi', fields: [
        { id: 'A6_checks', label: { en: 'Proof types', de: 'Nachweisarten' }, type: 'checkboxes', options: [
          { value: 'etg_urine', label: { en: 'EtG urine', de: 'EtG Urin' } },
          { value: 'etg_hair', label: { en: 'EtG hair', de: 'EtG Haar' } },
          { value: 'lab_provider', label: { en: 'Lab/provider noted', de: 'Labor/Anbieter notiert' } },
          { value: 'goal_6m', label: { en: 'Goal: 6 months', de: 'Ziel: 6 Monate' } },
          { value: 'goal_12m', label: { en: 'Goal: 12 months', de: 'Ziel: 12 Monate' } },
          { value: 'goal_15m', label: { en: 'Goal: 15 months', de: 'Ziel: 15 Monate' } },
        ] },
        { id: 'A6_uploads', label: { en: 'Upload links / references', de: 'Upload-Links / Referenzen' }, type: 'text_list' },
      ] },
      { id: 'A7_triggers', label: { en: 'High‑risk triggers', de: 'Hochrisiko‑Auslöser' }, type: 'long_text' },
      { id: 'A8_social_changes', label: { en: 'Social setting changes', de: 'Veränderungen im sozialen Umfeld' }, type: 'long_text' },
      { id: 'A9_toolkit', label: { en: 'Coping toolkit', de: 'Werkzeuge für Bewältigung' }, type: 'long_text' },
      { id: 'A10_knowledge', label: { en: 'Knowledge check', de: 'Wissenscheck' }, type: 'select_single', options: [
        { value: 'rule_1_6_mpu', label: { en: 'Know ≥ 1.6‰ MPU rule', de: 'Kennen der ≥ 1,6‰‑MPU‑Regel' } },
        { value: 'novice_zero_tolerance', label: { en: 'Zero‑tolerance for novice/probationary drivers', de: 'Null‑Toleranz für Fahranfänger/Probezeit' } },
        { value: 'no_mix_driving', label: { en: 'No mixing with driving', de: 'Kein Fahren unter Wirkung' } },
      ] },
    ],
  },
  {
    key: 'cannabis',
    title: { en: 'Branch: Cannabis', de: 'Zweig: Cannabis' },
    items: [
      { id: 'K1_pattern', label: { en: 'Pattern before incident (freq + text)', de: 'Muster vor dem Vorfall (Frequenz + Text)' }, type: 'multi', fields: [
        { id: 'K1_freq', label: { en: 'Frequency', de: 'Frequenz' }, type: 'select_single', options: [
          { value: 'never', label: { en: 'Never', de: 'Nie' } },
          { value: 'rarely', label: { en: 'Rarely', de: 'Selten' } },
          { value: 'monthly', label: { en: 'Monthly', de: 'Monatlich' } },
          { value: 'weekly', label: { en: 'Weekly', de: 'Wöchentlich' } },
          { value: 'daily', label: { en: 'Daily', de: 'Täglich' } },
        ] },
        { id: 'K1_details', label: { en: 'Details', de: 'Details' }, type: 'long_text' },
      ] },
      { id: 'K2_separation_rule', label: { en: 'Last use & separation rule (how long before driving?)', de: 'Letzter Konsum & Trennungsregel (wie lange vor dem Fahren?)' }, type: 'text' },
      { id: 'K3_highest_thc', label: { en: 'Highest THC value (ng/ml) & date', de: 'Höchster THC‑Wert (ng/ml) & Datum' }, type: 'multi', fields: [
        { id: 'K3_value', label: { en: 'THC (ng/ml)', de: 'THC (ng/ml)' }, type: 'number' },
        { id: 'K3_date', label: { en: 'Date', de: 'Datum' }, type: 'date' },
      ] },
      { id: 'K4_current_stance', label: { en: 'Current stance & proofs', de: 'Aktuelle Haltung & Nachweise' }, type: 'multi', fields: [
        { id: 'K4_choice', label: { en: 'Stance', de: 'Haltung' }, type: 'select_single', options: [
          { value: 'abstinence', label: { en: 'Abstinence', de: 'Abstinenz' } },
          { value: 'controlled', label: { en: 'Controlled use', de: 'Kontrollierter Konsum' } },
        ] },
        { id: 'K4_uploads', label: { en: 'Proof upload links', de: 'Nachweis‑Uploads' }, type: 'text_list' },
      ] },
      { id: 'K5_insight', label: { en: 'Driving‑while‑impaired insight', de: 'Einsicht Fahren unter Wirkung' }, type: 'long_text' },
      { id: 'K6_triggers_coping', label: { en: 'Triggers & coping', de: 'Auslöser & Bewältigung' }, type: 'long_text' },
      { id: 'K7_co_use', label: { en: 'Co‑use with alcohol (yes/no + text)', de: 'Mischkonsum mit Alkohol (ja/nein + Text)' }, type: 'multi', fields: [
        { id: 'K7_yesno', label: { en: 'Co‑use?', de: 'Mischkonsum?' }, type: 'select_single', options: [
          { value: 'no', label: { en: 'No', de: 'Nein' } },
          { value: 'yes', label: { en: 'Yes', de: 'Ja' } },
        ] },
        { id: 'K7_details', label: { en: 'Details', de: 'Details' }, type: 'text' },
      ] },
      { id: 'K8_knowledge', label: { en: 'Knowledge check', de: 'Wissenscheck' }, type: 'select_single', options: [
        { value: 'law_3_5_ng', label: { en: 'Aware of 3.5 ng/ml law (22 Aug 2024)', de: 'Kenntnis des 3,5‑ng/ml‑Wertes (seit 22.08.2024)' } },
        { value: 'no_impaired_driving', label: { en: 'Prohibition of impaired driving', de: 'Verbot, unter Wirkung zu fahren' } },
        { value: 'mixed_use_risks', label: { en: 'Risks of mixed use', de: 'Risiken bei Mischkonsum' } },
      ] },
      { id: 'K9_monitoring', label: { en: 'Monitoring plan', de: 'Monitoring‑Plan' }, type: 'long_text' },
    ],
  },
  {
    key: 'drugs',
    title: { en: 'Branch: Other drugs/meds', de: 'Zweig: Andere Drogen/Medikamente' },
    items: [
      { id: 'D1_substances', label: { en: 'Substance(s)', de: 'Substanz(en)' }, type: 'checkboxes', options: [
        { value: 'amphetamines', label: { en: 'Amphetamines', de: 'Amphetamine' } },
        { value: 'cocaine', label: { en: 'Cocaine', de: 'Kokain' } },
        { value: 'opioids', label: { en: 'Opioids', de: 'Opioide' } },
        { value: 'benzodiazepines', label: { en: 'Benzodiazepines', de: 'Benzodiazepine' } },
        { value: 'nps', label: { en: 'NPS', de: 'NPS' } },
        { value: 'others', label: { en: 'Others', de: 'Andere' } },
      ] },
      { id: 'D2_pattern', label: { en: 'Pattern (freq + route + context)', de: 'Muster (Frequenz + Konsumweg + Kontext)' }, type: 'long_text' },
      { id: 'D3_prescription_meds', label: { en: 'Prescription meds affecting alertness (details + uploads)', de: 'Verschreibungspflichtige, verkehrsrelevante Medikamente (Details + Uploads)' }, type: 'multi', fields: [
        { id: 'D3_details', label: { en: 'Details', de: 'Details' }, type: 'long_text' },
        { id: 'D3_uploads', label: { en: 'Upload links', de: 'Upload-Links' }, type: 'text_list' },
      ] },
      { id: 'D4_treatment', label: { en: 'Treatment/substitution', de: 'Behandlung/Substitution' }, type: 'long_text' },
      { id: 'D5_abstinence_proofs', label: { en: 'Abstinence strategy & proofs (CTU)', de: 'Abstinenzstrategie & Nachweise (CTU)' }, type: 'multi', fields: [
        { id: 'D5_strategy', label: { en: 'Strategy', de: 'Strategie' }, type: 'long_text' },
        { id: 'D5_uploads', label: { en: 'Upload links', de: 'Upload-Links' }, type: 'text_list' },
      ] },
      { id: 'D6_separation', label: { en: 'Separation of use and driving', de: 'Trennung von Konsum und Fahren' }, type: 'long_text' },
      { id: 'D7_triggers_coping', label: { en: 'Triggers & coping', de: 'Auslöser & Bewältigung' }, type: 'long_text' },
      { id: 'D8_knowledge', label: { en: 'Knowledge seed (no controlled use for hard drugs)', de: 'Wissenscheck (kein „kontrollierter“ Konsum bei harten Drogen)' }, type: 'select_single', options: [
        { value: 'abstinence_required', label: { en: 'Understands abstinence requirement in typical assessments', de: 'Versteht Abstinenzerfordernis in typischen Begutachtungen' } },
      ] },
    ],
  },
  {
    key: 'points',
    title: { en: 'Branch: Points / repeated violations', de: 'Zweig: Punkte / wiederholte Verstöße' },
    items: [
      { id: 'P1_current_points', label: { en: 'Current points + categories', de: 'Aktuelle Punkte + Kategorien' }, type: 'multi', fields: [
        { id: 'P1_points', label: { en: 'Points (number)', de: 'Punkte (Anzahl)' }, type: 'number' },
        { id: 'P1_categories', label: { en: 'Categories', de: 'Kategorien' }, type: 'checkboxes', options: [
          { value: 'speeding', label: { en: 'Speeding', de: 'Geschwindigkeit' } },
          { value: 'red_light', label: { en: 'Red light', de: 'Rotlicht' } },
          { value: 'phone', label: { en: 'Phone', de: 'Handy' } },
          { value: 'tailgating', label: { en: 'Tailgating', de: 'Drängeln' } },
        ] },
      ] },
      { id: 'P2_timeline', label: { en: 'Timeline & clustering', de: 'Zeitlinie & Häufung' }, type: 'long_text' },
      { id: 'P3_situational_causes', label: { en: 'Situational causes', de: 'Situative Ursachen' }, type: 'long_text' },
      { id: 'P4_rule_knowledge', label: { en: 'Rule knowledge self‑rating (0–10)', de: 'Wissens-Selbsteinschätzung (0–10)' }, type: 'number' },
      { id: 'P5_behavior_changes', label: { en: 'Behavior changes', de: 'Verhaltensänderungen' }, type: 'long_text' },
      { id: 'P6_support', label: { en: 'Support / accountability', de: 'Unterstützung / Accountability' }, type: 'long_text' },
      { id: 'P7_knowledge', label: { en: 'Knowledge seed (8 points → license withdrawn; FES limits)', de: 'Wissenscheck (8 Punkte → Entziehung; FES‑Grenzen)' }, type: 'select_single', options: [
        { value: 'eight_points_rule', label: { en: 'Understands 8 points rule', de: 'Kennt 8‑Punkte‑Regel' } },
      ] },
      { id: 'P8_proofs', label: { en: 'Proof of completion (seminars, trainings)', de: 'Nachweise (Seminare, Trainings)' }, type: 'text_list' },
    ],
  },
  {
    key: 'aggression',
    title: { en: 'Branch: Aggression / violence', de: 'Zweig: Aggression / Gewalt' },
    items: [
      { id: 'G1_nature', label: { en: 'Incident nature', de: 'Art des Vorfalls' }, type: 'long_text' },
      { id: 'G2_triggers', label: { en: 'Triggers', de: 'Auslöser' }, type: 'long_text' },
      { id: 'G3_skills', label: { en: 'Skills acquired (anger regulation, CBT)', de: 'Erworbene Skills (Emotionsregulation, KVT)' }, type: 'long_text' },
      { id: 'G4_controls', label: { en: 'Situational controls (de‑escalation)', de: 'Situative Kontrollen (Deeskalation)' }, type: 'long_text' },
      { id: 'G5_support', label: { en: 'Support & monitoring', de: 'Unterstützung & Monitoring' }, type: 'long_text' },
    ],
  },
  {
    key: 'medical',
    title: { en: 'Branch: Medical / neurological', de: 'Zweig: Medizinisch / neurologisch' },
    items: [
      { id: 'M1_diagnoses', label: { en: 'Diagnoses relevant to driving', de: 'Fahren relevante Diagnosen' }, type: 'long_text' },
      { id: 'M2_clinician', label: { en: 'Treating clinician & last review (date)', de: 'Behandelnde:r Arzt/Ärztin & letzter Termin (Datum)' }, type: 'multi', fields: [
        { id: 'M2_name', label: { en: 'Clinician', de: 'Behandler:in' }, type: 'text' },
        { id: 'M2_last_review', label: { en: 'Last review', de: 'Letzte Kontrolle' }, type: 'date' },
      ] },
      { id: 'M3_med_timing', label: { en: 'Medication timing vs. driving', de: 'Medikamenten‑Timing vs. Fahren' }, type: 'long_text' },
      { id: 'M4_episode_log', label: { en: 'Episode log (last event, control)', de: 'Ereignisprotokoll (letztes Ereignis, Kontrolle)' }, type: 'long_text' },
      { id: 'M5_attestations', label: { en: 'Attestations (upload links)', de: 'Atteste (Upload‑Links)' }, type: 'text_list' },
      { id: 'M6_adaptations', label: { en: 'Adaptations (CPAP logs, glucose monitoring)', de: 'Anpassungen (CPAP‑Protokolle, Glukosemessung)' }, type: 'long_text' },
    ],
  },
]

export function labelFor(lang: 'en' | 'de', t: LangText) {
  return lang === 'de' ? t.de : t.en
}

