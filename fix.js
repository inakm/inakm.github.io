const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Update Profile Summary
const profileOld = `<p class="text-lg md:text-xl text-gray-200 leading-relaxed font-body mb-6">
                            I am a <strong class="text-white border-b-2 border-brand-stormy">B.Com (Hons)
                                student</strong> at Gandhi Institute of Technology and Management (GITAM) University and
                            an <strong class="text-brand-highlight">ACCA Trainee</strong> with 8 out of 13 papers
                            already completed. My goal is to take complicated financial data and turn it into clear
                            plans that help businesses grow.
                        </p>
                        <p class="text-lg md:text-xl text-gray-200 leading-relaxed font-body mb-6">
                            During my time at Mindsparc Innovations, I built 3-year financial models, used SQL and Power
                            Query to organize data, and learned how to predict future trends rather than just looking at
                            the past. While I am well-trained in traditional accounting, I am also very passionate about
                            the future of money—specifically <strong class="text-brand-highlight">Fintech, Crypto, and
                                DeFi</strong>.
                        </p>
                        <p class="text-lg md:text-xl text-brand-lavender leading-relaxed font-body">
                            I am now looking for an entry-level role in <strong class="text-white">FP&A or Finance
                                Operations</strong>. I want to bring my technical skills to a great team while I finish
                            my journey to becoming a fully qualified ACCA professional.
                        </p>`;

const profileNew = `<p class="text-lg md:text-xl text-gray-200 leading-relaxed font-body mb-6">
                            I am a <strong class="text-white border-b-2 border-brand-stormy">ACCA Part-Qualified (8/13 papers cleared)</strong> and <strong class="text-brand-highlight">B.Com (Hons) candidate</strong> with hands-on experience in financial reporting, reconciliations, and variance analysis.
                        </p>
                        <p class="text-lg md:text-xl text-gray-200 leading-relaxed font-body mb-6">
                            Skilled in Excel-based financial modeling, KPI reporting, and data validation. Working knowledge of IFRS, IAS, and GAAP principles.
                        </p>
                        <p class="text-lg md:text-xl text-brand-lavender leading-relaxed font-body">
                            Seeking entry-level <strong class="text-white">Financial Analyst</strong> roles to apply analytical and accounting expertise in data-driven decision making.
                        </p>`;
html = html.replace(profileOld, profileNew);

// 2. Update CV Link
html = html.replace(
    'href="https://drive.google.com/file/d/1lfowyB4QG25FwX2K9iMTIhRji6DtFB2l/view?usp=sharing"',
    'href="https://drive.google.com/file/d/1aicGkRAu44MOpi6gx3hXwn_o5itfSNZN/view?usp=sharing"'
);

// 3. Fix Expertise Matrix layout
const oldGrid = 'class="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-6 mb-10 auto-rows-min"';
const newGrid = 'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 items-stretch"';
html = html.replace(oldGrid, newGrid);

const oldB1 = 'class="card-3d p-6 md:p-8 reveal-left md:col-span-2 row-span-1 flex flex-col h-full bg-brand-deepSpace/60 border border-white/10 hover:border-brand-stormy transition-all"';
const newB1 = 'class="card-3d p-6 md:p-8 reveal-left flex flex-col h-full bg-brand-deepSpace/60 border border-white/10 hover:border-brand-stormy transition-all"';
html = html.replace(oldB1, newB1);

const oldB2 = 'class="card-3d p-6 md:p-8 reveal-right md:col-span-1 md:row-span-2 flex flex-col h-full bg-gradient-to-br from-brand-stormy/30 to-brand-midnight/60 border border-white/10 hover:border-brand-stormy transition-all"';
const newB2 = 'class="card-3d p-6 md:p-8 reveal-right flex flex-col h-full bg-gradient-to-br from-brand-stormy/30 to-brand-midnight/60 border border-white/10 hover:border-brand-stormy transition-all"';
html = html.replace(oldB2, newB2);

const oldB3 = 'class="card-3d p-6 md:p-8 reveal-left md:col-span-1 row-span-1 flex flex-col h-full bg-brand-charcoal/40 border border-white/10 hover:border-brand-stormy transition-all"';
const newB3 = 'class="card-3d p-6 md:p-8 reveal-left flex flex-col h-full bg-brand-charcoal/40 border border-white/10 hover:border-brand-stormy transition-all"';
html = html.replace(oldB3, newB3);

const oldB4 = 'class="card-3d p-6 md:p-8 reveal-right md:col-span-1 row-span-1 flex flex-col h-full bg-brand-deepPurple/20 border border-white/10 hover:border-brand-stormy transition-all"';
const newB4 = 'class="card-3d p-6 md:p-8 reveal-right flex flex-col h-full bg-brand-deepPurple/20 border border-white/10 hover:border-brand-stormy transition-all"';
html = html.replace(oldB4, newB4);

// Fix Financial Analysis Tags
html = html.replace('class="flex flex-col gap-3 mt-auto w-full"', 'class="flex flex-wrap gap-2 mt-auto w-full"');
html = html.split('text-center w-full').join('');

// 4. Remove dark mode for AI tools
html = html.split('bg-[#0b0c10]').join('bg-brand-deepSpace/40');
html = html.split('border-white/5').join('border-white/10');

fs.writeFileSync(indexHtmlPath, html, 'utf8');
console.log("Updated string replacements in index.html");
