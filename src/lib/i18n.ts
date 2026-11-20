import type { Language } from './types';

export const UI_COPY: Record<
  Language,
  {
    brand: string;
    nav: {
      pulse: string;
      clinic: string;
      planner: string;
      irrigation: string;
      advisor: string;
    };
    scanCropCta: string;
    districtLabel: string;
    seasonLabel: string;
    heroKicker: string;
    heroTitle: string;
    heroSubtitle: string;
    telemetry: {
      temp: string;
      rain7d: string;
      humidity: string;
      et0: string;
      solar: string;
      moisture: string;
    };
    chartTitle: string;
    chartSubtitle: string;
    rainLegend: string;
    et0Legend: string;
    alertsHeading: string;
    alertsSubheading: string;
    actionsHeading: string;
    clinicTitle: string;
    clinicSubtitle: string;
    uploadLabel: string;
    uploadHint: string;
    specimenHeading: string;
    cropSelectLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    analyzeBtn: string;
    analyzingBtn: string;
    saveLogBtn: string;
    savedBtn: string;
    fieldLogHeading: string;
    fieldLogEmpty: string;
    clearLogBtn: string;
    plannerTitle: string;
    plannerSubtitle: string;
    aiBriefBtn: string;
    aiBriefLoading: string;
    irrigationTitle: string;
    irrigationSubtitle: string;
    advisorTitle: string;
    advisorSubtitle: string;
    advisorPlaceholder: string;
    sendBtn: string;
    docsLink: string;
    daeHelpline: string;
    severityLabels: {
      Nominal: string;
      Watch: string;
      Critical: string;
    };
  }
> = {
  en: {
    brand: 'FasalBondhu AI',
    nav: {
      pulse: 'Field Pulse',
      clinic: 'Crop Clinic',
      planner: 'Crop Planner',
      irrigation: 'Irrigation',
      advisor: 'Bangla Advisor',
    },
    scanCropCta: 'Scan Crop',
    districtLabel: 'District',
    seasonLabel: 'Season',
    heroKicker: 'Bangladesh Agro-Climate Companion',
    heroTitle: 'Timely field decisions for a changing climate',
    heroSubtitle:
      'Location-specific weather guidance, crop disease triage, water-saving irrigation, and practical advice in simple Bangla.',
    telemetry: {
      temp: 'Daytime High',
      rain7d: '7-Day Rainfall',
      humidity: 'Relative Humidity',
      et0: 'Daily ET₀ Loss',
      solar: 'NASA Solar Flux',
      moisture: 'Topsoil Moisture',
    },
    chartTitle: '7-Day Rainfall & Evapotranspiration Balance',
    chartSubtitle: 'Compare expected rain against daily crop water loss to time irrigation and fertilizer safely.',
    rainLegend: 'Rainfall (mm)',
    et0Legend: 'Crop Water Loss ET₀ (mm)',
    alertsHeading: 'Active Climate-Risk Advisories',
    alertsSubheading: 'Rule-based warnings derived from 7-day forecast thresholds and local AEZ hazards.',
    actionsHeading: 'Recommended Field Priorities Today',
    clinicTitle: 'AI Crop Disease & Pest Clinic',
    clinicSubtitle:
      'Upload a clear photo of an affected leaf or stem—or test a Bangladesh field specimen—for instant Bangla & English IPM guidance.',
    uploadLabel: 'Upload Crop Photo',
    uploadHint: 'JPG, PNG or WebP · Natural daylight close-up works best',
    specimenHeading: 'Or test with Bangladesh field specimens',
    cropSelectLabel: 'Crop Name',
    notesLabel: 'Field Observation (Optional)',
    notesPlaceholder: 'Example: Yellowing started 3 days ago after foggy morning...',
    analyzeBtn: 'Analyze Crop with AI',
    analyzingBtn: 'Examining Leaf Symptoms...',
    saveLogBtn: 'Save to Field Log',
    savedBtn: 'Saved to Field Log',
    fieldLogHeading: 'Saved Field Diagnosis Log',
    fieldLogEmpty: 'No diagnoses saved yet. Run a crop photo analysis and save it to build your seasonal field record.',
    clearLogBtn: 'Clear Log',
    plannerTitle: 'Climate-Smart Crop Planner',
    plannerSubtitle:
      'Match BRRI, BARI, and BINA varieties to your district soil texture, pH, salinity, and water regime.',
    aiBriefBtn: 'Generate Bangla Planting Brief',
    aiBriefLoading: 'Preparing Localized Brief...',
    irrigationTitle: 'Irrigation & AWD Water Advisor',
    irrigationSubtitle:
      'Compute net irrigation depth in millimeters and liters per Bangladeshi decimal/bigha with Alternate Wetting and Drying savings.',
    advisorTitle: 'Bangla Field Advisor',
    advisorSubtitle:
      'Ask practical questions about pests, fertilizer timing, flood recovery, or soil care—grounded in your active district forecast.',
    advisorPlaceholder: 'Ask in Bangla or English (e.g., ধানের পাতা লাল হয়ে যাচ্ছে, এখন কী করবো?)',
    sendBtn: 'Ask Advisor',
    docsLink: 'Data Sources & Responsible AI',
    daeHelpline: 'DAE Krishi Call Center: 16123',
    severityLabels: {
      Nominal: 'Nominal',
      Watch: 'Watch',
      Critical: 'Critical',
    },
  },
  bn: {
    brand: 'ফসলবন্ধু এআই',
    nav: {
      pulse: 'মাঠের আবহাওয়া',
      clinic: 'ফসল ক্লিনিক',
      planner: 'ফসল নির্বাচন',
      irrigation: 'সেচ পরামর্শ',
      advisor: 'কৃষি বন্ধু',
    },
    scanCropCta: 'ফসল পরীক্ষা',
    districtLabel: 'জেলা',
    seasonLabel: 'মৌসুম',
    heroKicker: 'বাংলাদেশ কৃষি ও জলবায়ু সহায়ক',
    heroTitle: 'সঠিক সময়ে সঠিক কৃষি সিদ্ধান্ত, সহজ বাংলায়',
    heroSubtitle:
      'এলাকাভিত্তিক আবহাওয়া সতর্কতা, ফসলের রোগ শনাক্তকরণ, সাশ্রয়ী সেচ পরিকল্পনা এবং নিরাপদ চাষাবাদ পরামর্শ।',
    telemetry: {
      temp: 'দিনের তাপমাত্রা',
      rain7d: '৭ দিনের বৃষ্টি',
      humidity: 'বাতাসের আর্দ্রতা',
      et0: 'দৈনিক বাষ্পীভবন',
      solar: 'নাসা সৌরশক্তি',
      moisture: 'মাটির রস',
    },
    chartTitle: '৭ দিনের বৃষ্টিপাত ও পানির চাহিদার ভারসাম্য',
    chartSubtitle: 'সেচ ও সার প্রয়োগের সঠিক সময় ঠিক করতে বৃষ্টি ও বাষ্পীভবনের তুলনা দেখুন।',
    rainLegend: 'বৃষ্টিপাত (মিমি)',
    et0Legend: 'পানি ক্ষয় ET₀ (মিমি)',
    alertsHeading: 'জলবায়ু ঝুঁকি ও আগাম সতর্কতা',
    alertsSubheading: '৭ দিনের আবহাওয়া পূর্বাভাস ও স্থানীয় কৃষি অঞ্চলের ঝুঁকি অনুযায়ী প্রস্তুত।',
    actionsHeading: 'আজকের করণীয় মাঠ পর্যায়ের কাজ',
    clinicTitle: 'এআই ফসলের রোগ ও পোকা শনাক্তকরণ',
    clinicSubtitle:
      'আক্রান্ত পাতা বা কাণ্ডের পরিষ্কার ছবি আপলোড করুন—অথবা নিচের নমুনা ছবি বেছে নিয়ে সহজ বাংলায় চিকিৎসা পরামর্শ জানুন।',
    uploadLabel: 'আক্রান্ত ফসলের ছবি আপলোড করুন',
    uploadHint: 'JPG, PNG বা WebP · দিনের আলোয় কাছ থেকে তোলা ছবি সবচেয়ে ভালো কাজ করে',
    specimenHeading: 'অথবা বাংলাদেশের সাধারণ নমুনা ছবি দিয়ে পরীক্ষা করুন',
    cropSelectLabel: 'ফসলের নাম',
    notesLabel: 'মাঠের লক্ষণ (ঐচ্ছিক)',
    notesPlaceholder: 'যেমন: ঘন কুয়াশার পর গত ৩ দিন ধরে পাতায় বাদামি দাগ দেখা যাচ্ছে...',
    analyzeBtn: 'এআই দিয়ে রোগ শনাক্ত করুন',
    analyzingBtn: 'পাতার লক্ষণ বিশ্লেষণ করা হচ্ছে...',
    saveLogBtn: 'মাঠের খাতায় সংরক্ষণ করুন',
    savedBtn: 'সংরক্ষিত হয়েছে',
    fieldLogHeading: 'সংরক্ষিত ফসল পরীক্ষার তালিকা',
    fieldLogEmpty: 'এখনো কোনো রিপোর্ট সংরক্ষণ করা হয়নি। ফসলের ছবি পরীক্ষা করে এখানে সংরক্ষণ করুন।',
    clearLogBtn: 'তালিকা মুছুন',
    plannerTitle: 'জলবায়ু-সহনশীল ফসল নির্বাচন',
    plannerSubtitle:
      'আপনার জেলার মাটি, অম্লত্ব (pH), লবণাক্ততা ও পানির প্রাপ্যতা অনুযায়ী ব্রি, বারি ও বিনা জাত বাছাই করুন।',
    aiBriefBtn: 'বাংলায় বিস্তারিত চাষাবাদ নির্দেশিকা তৈরি করুন',
    aiBriefLoading: 'নির্দেশিকা তৈরি হচ্ছে...',
    irrigationTitle: 'সাশ্রয়ী সেচ ও AWD পরামর্শ',
    irrigationSubtitle:
      'শতাংশ ও বিঘা অনুযায়ী সঠিক সেচের পরিমাণ (লিটার ও মিমি) এবং বোরো ধানে পানি সাশ্রয়ের হিসাব জানুন।',
    advisorTitle: 'বাংলা কৃষি বন্ধু (এআই সহায়ক)',
    advisorSubtitle:
      'রোগবালাই, সার ব্যবস্থাপনা, বন্যা-পরবর্তী যত্ন বা মাটির স্বাস্থ্য নিয়ে সরাসরি প্রশ্ন করুন।',
    advisorPlaceholder: 'আপনার প্রশ্ন লিখুন (যেমন: ধানের পাতা লাল হয়ে যাচ্ছে, এখন কী করবো?)',
    sendBtn: 'জিজ্ঞাসা করুন',
    docsLink: 'তথ্যসূত্র ও দায়িত্বশীল এআই',
    daeHelpline: 'কৃষি কল সেন্টার: ১৬১২৩',
    severityLabels: {
      Nominal: 'স্বাভাবিক',
      Watch: 'সতর্কতা',
      Critical: 'জরুরি ঝুঁকি',
    },
  },
};
