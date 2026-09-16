import path from 'node:path';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: path.resolve(import.meta.dirname, '../../.env') });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const templates = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'The Executive',
    tagline: 'Classic • Professional',
    thumbnailUrl: '/templates/the-executive.png',
    industries: ['technology', 'finance'],
    styles: ['classic', 'professional'],
    isAtsFriendly: true,
    structureJson: {
      layout: 'single-column',
      sections: [
        { type: 'contact', required: true, position: 'header' },
        { type: 'summary', required: false, position: 1 },
        { type: 'experience', required: true, position: 2 },
        { type: 'education', required: true, position: 3 },
        { type: 'skills', required: false, position: 4 },
      ],
      font: 'Inter',
      accentColor: '#0F766E',
    },
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'The Creative',
    tagline: 'Modern • Bold',
    thumbnailUrl: '/templates/the-creative.png',
    industries: ['creative', 'design'],
    styles: ['modern', 'bold'],
    isAtsFriendly: false,
    structureJson: {
      layout: 'two-column',
      sections: [
        { type: 'contact', required: true, position: 'header' },
        { type: 'summary', required: false, position: 1 },
        { type: 'skills', required: false, position: 'sidebar' },
        { type: 'experience', required: true, position: 2 },
        { type: 'education', required: true, position: 3 },
      ],
      font: 'Arial, sans-serif',
      accentColor: '#BA1A1A',
    },
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'The Academic',
    tagline: 'Traditional • Detailed',
    thumbnailUrl: '/templates/the-academic.png',
    industries: ['education', 'research'],
    styles: ['classic', 'traditional'],
    isAtsFriendly: true,
    structureJson: {
      layout: 'single-column',
      sections: [
        { type: 'contact', required: true, position: 'header' },
        { type: 'summary', required: false, position: 1 },
        { type: 'education', required: true, position: 2 },
        { type: 'experience', required: true, position: 3 },
        { type: 'certifications', required: false, position: 4 },
        { type: 'skills', required: false, position: 5 },
      ],
      font: "'Georgia, serif'",
      accentColor: '#191c1e',
    },
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Minimalist',
    tagline: 'Modern • Minimal',
    thumbnailUrl: '/templates/minimalist.png',
    industries: ['technology'],
    styles: ['minimal', 'modern'],
    isAtsFriendly: true,
    structureJson: {
      layout: 'single-column',
      sections: [
        { type: 'contact', required: true, position: 'header' },
        { type: 'experience', required: true, position: 1 },
        { type: 'education', required: true, position: 2 },
        { type: 'skills', required: false, position: 3 },
      ],
      font: 'Inter',
      accentColor: '#3E4947',
    },
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Modern Sidebar',
    tagline: 'Contemporary • Two-column',
    thumbnailUrl: '/templates/modern-sidebar.png',
    industries: ['technology', 'design', 'marketing'],
    styles: ['modern', 'bold'],
    isAtsFriendly: false,
    structureJson: {
      layout: 'two-column',
      sections: [
        { type: 'contact', required: true, position: 'header' },
        { type: 'summary', required: false, position: 1 },
        { type: 'experience', required: true, position: 2 },
        { type: 'skills', required: false, position: 'sidebar' },
        { type: 'certifications', required: false, position: 'sidebar' },
        { type: 'education', required: true, position: 'sidebar' },
      ],
      font: 'Inter',
      accentColor: '#7C3AED',
    },
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Compact ATS',
    tagline: 'Dense • ATS-safe',
    thumbnailUrl: '/templates/compact-ats.png',
    industries: ['finance', 'operations', 'technology'],
    styles: ['minimal', 'classic'],
    isAtsFriendly: true,
    structureJson: {
      layout: 'single-column',
      sections: [
        { type: 'contact', required: true, position: 'header' },
        { type: 'experience', required: true, position: 1 },
        { type: 'skills', required: false, position: 2 },
        { type: 'education', required: true, position: 3 },
        { type: 'certifications', required: false, position: 4 },
      ],
      font: "'Times New Roman', serif",
      accentColor: '#1D4ED8',
    },
  },
];

async function main() {
  for (const template of templates) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: template,
      create: template,
    });
  }
  console.log(`Seeded ${templates.length} templates.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
