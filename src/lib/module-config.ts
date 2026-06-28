/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ModuleConfig {
  id: string;
  title: string;
  documentType: string;
  aiPersona: string;
  uploadTitle: string;
  roleKeywords?: {
    procedure?: string[];
    observation?: string[];
    result?: string[];
    interpretation?: string[];
    conclusion?: string[];
    resource_table?: string[];
    student_table?: string[];
  };
  suggestedCommands: string[];
  isComingSoon?: boolean;
}

export const DOCUMENT_MODULES: ModuleConfig[] = [
  {
    id: 'practicum',
    title: 'Practicum',
    documentType: 'Engineering Lab Record',
    aiPersona: 'Engineering Lab Assistant',
    uploadTitle: 'Upload Practicum template',
    roleKeywords: {
      procedure: ['procedure', 'actual procedure followed', 'methodology', 'steps', 'implementation', 'algorithm'],
      observation: ['observation', 'observations'],
      result: ['results', 'result', 'outcome', 'findings', 'results observations', 'results/observations'],
      interpretation: ['interpretation', 'interpretation of results', 'meaning of results', 'students to state the meaning', 'analysis', 'discussion', 'inference'],
      conclusion: ['conclusion', 'conclusions', 'students to draw conclusions', 'draw conclusions', 'take decisions', 'take decision', 'learners to draw conclusions', 'final remarks', 'summary'],
      resource_table: ['actual resources used', 'actual resources', 'materials used', 'tools used', 'resources used'],
      student_table: ['filled by student', 'student information', 'student details', 'identity', 'to be filled by student', 'to be filled by the student']
    },
    suggestedCommands: [
      "Draft MQTT Procedure",
      "Generate detailed observations",
      "Explain network characteristics",
      "Verify configuration constraints"
    ]
  },
  {
    id: 'micro_project',
    title: 'Micro Project',
    documentType: 'Micro Project Proposal',
    aiPersona: 'Entrepreneurship Project Proposal Assistant',
    uploadTitle: 'Upload Micro Project Template',
    roleKeywords: {
      procedure: ['proposed methodology', 'methodology', 'action plan', 'tentative action plan', 'steps', 'proposed timeline'],
      observation: ['literature review', 'rationale', 'background study'],
      result: ['tentative resources', 'resources', 'materials needed'],
      interpretation: ['project title', 'objectives', 'scope'],
      conclusion: ['deliverables', 'expected outcomes', 'conclusion'],
      resource_table: ['tentative resources', 'resources', 'equipment needed'],
      student_table: ['student details', 'course details', 'student information', 'identity', 'to be filled by student']
    },
    suggestedCommands: [
      "Generate rationale",
      "Improve literature review",
      "Generate methodology",
      "Rewrite professionally",
      "Expand action plan",
      "Generate tentative resources"
    ]
  },
  {
    id: 'mini_project',
    title: 'Mini Project',
    documentType: 'Mini Project Report',
    aiPersona: 'Project Development Advisor',
    uploadTitle: 'Upload Mini Project Template',
    roleKeywords: {
      procedure: ['methodology', 'proposed work', 'implementation details'],
      observation: ['observations', 'data collected', 'experimental results'],
      resource_table: ['hardware requirements', 'software requirements', 'tools used'],
      student_table: ['student details', 'project details', 'team details']
    },
    suggestedCommands: [
      "Improve design methodology",
      "Refine block diagram explanation",
      "Draft test case scenarios",
      "Analyze project outcomes"
    ]
  },
  {
    id: 'major_project',
    title: 'Major Project',
    documentType: 'Major Project Thesis',
    aiPersona: 'Senior Academic Thesis Reviewer',
    uploadTitle: 'Upload Major Project Template',
    roleKeywords: {
      procedure: ['system architecture', 'methodology', 'proposed framework', 'implementation flow'],
      observation: ['results analysis', 'experimental evaluation', 'performance metrics'],
      resource_table: ['system specifications', 'development tools'],
      student_table: ['author details', 'project team information']
    },
    suggestedCommands: [
      "Formalize architectural description",
      "Draft research contribution",
      "Enhance dataset discussion",
      "Review thesis abstract"
    ]
  },
  {
    id: 'internship',
    title: 'Internship',
    documentType: 'Internship Report',
    aiPersona: 'Industry Internship Mentor',
    uploadTitle: 'Upload Internship Template',
    roleKeywords: {
      procedure: ['work completed', 'tasks undertaken', 'weekly summary'],
      observation: ['industry learning', 'skills acquired', 'organizational study'],
      resource_table: ['tools and technologies', 'industry standard setups'],
      student_table: ['intern details', 'company supervisor info']
    },
    suggestedCommands: [
      "Summarize internship duties professionally",
      "Detail industrial tech stack utilized",
      "Formulate key learning outcomes",
      "Draft internship summary"
    ]
  },
  {
    id: 'seminar',
    title: 'Seminar',
    documentType: 'Seminar Report',
    aiPersona: 'Academic Seminar Advisor',
    uploadTitle: 'Upload Seminar Template',
    roleKeywords: {
      procedure: ['literature survey', 'presentation outline', 'topic details'],
      observation: ['discussion on chosen topic', 'technological impact'],
      resource_table: ['references and citations'],
      student_table: ['student details', 'seminar coordinator info']
    },
    suggestedCommands: [
      "Generate abstract summary",
      "Refine future trends section",
      "Structure presentation slides flow",
      "Summarize literature sources"
    ]
  },
  {
    id: 'research',
    title: 'Research',
    documentType: 'Research Proposal',
    aiPersona: 'Research Grant Reviewer',
    uploadTitle: 'Upload Research Proposal',
    suggestedCommands: [],
    isComingSoon: true
  },
  {
    id: 'dissertation',
    title: 'Dissertation',
    documentType: 'Dissertation Thesis',
    aiPersona: 'Doctoral Committee Reviewer',
    uploadTitle: 'Upload Dissertation Template',
    suggestedCommands: [],
    isComingSoon: true
  },
  {
    id: 'assignment',
    title: 'Assignment',
    documentType: 'Course Assignment',
    aiPersona: 'Course Instructor',
    uploadTitle: 'Upload Assignment Template',
    suggestedCommands: [],
    isComingSoon: true
  }
];

export const getModuleById = (id: string): ModuleConfig => {
  return DOCUMENT_MODULES.find(m => m.id === id) || DOCUMENT_MODULES[0];
};
