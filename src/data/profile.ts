// -----------------------------------------------------------------------------
// Your profile. Edit this file to update the homepage — no markup required.
// -----------------------------------------------------------------------------

export const profile = {
  name: "Rafael Sendra-Arranz",
  role: "Postdoctoral Researcher",
  affiliation: "Biorobotics Group · Centre for Automation and Robotics (CAR), CSIC",
  location: "Madrid, Spain",
  email: "r.sendra@csic.es",
  // Drop a photo at /public/rafael.jpg (square works best) and this will pick it up.
  photo: "/rafael.jpg",

  // A short lead paragraph, then the body. Keep it human.
  intro:
    "I am a postdoctoral researcher in the Biorobotics Group at the Centre for Automation and Robotics (CAR), CSIC.",
  bio: [
    "Inspired by how swarms of animals behave in nature, my research focuses on the emergence and origins of automatic communication among robots, in the fields of Swarm Robotics and Evolutionary Robotics.",
    "In 2022 I did a four-month research stay at the Biorobotics department of the University of Southern Denmark, where I discovered new techniques and computational paradigms for efficient and explainable swarm-robotics communication — an inflexion point for my PhD research. I have also worked on time-series forecasting using deep-learning models.",
    "I completed my PhD in Communication Technologies and Systems at the Universidad Politécnica de Madrid in 2025, with a dissertation on the emergence of transferable communication in swarm robotics: from signalling towards language.",
  ],

  interests: [
    "Swarm Robotics",
    "Evolutionary Computation",
    "Deep Learning",
    "Machine Learning",
    "Large Language Models",
    "Time Series Forecasting",
  ],

  // Rendered as clickable icon links in the hero and footer.
  links: {
    scholar: "https://scholar.google.com/citations?user=Op6CdlAAAAAJ&hl=en",
    orcid: "https://orcid.org/0000-0003-2746-8677",
    github: "https://github.com/r-sendra",
    linkedin: "https://linkedin.com/in/rafael-sendra-arranz/",
  },
} as const;

export type EducationItem = {
  degree: string;
  institution: string;
  period: string;
  note?: string;
};

export const education: EducationItem[] = [
  {
    degree: "PhD in Communication Technologies and Systems",
    institution: "Universidad Politécnica de Madrid",
    period: "2021 – 2025",
    note: "Thesis: “Emergence of transferable communication in swarm robotics: from signalling towards language.”",
  },
  {
    degree: "MSc in Signal Theory and Communications",
    institution: "Universidad Politécnica de Madrid",
    period: "2021 – 2022",
    note: "Specialization in signal processing and machine learning for big data.",
  },
  {
    degree: "MSc in Telecommunication Engineering",
    institution: "Universidad Politécnica de Madrid",
    period: "2019 – 2022",
  },
  {
    degree: "BEng in Telecommunication Technologies and Services Engineering",
    institution: "Universidad Politécnica de Madrid",
    period: "2013 – 2018",
  },
];

export const footerAddress =
  "Centre for Automation and Robotics (CAR), CSIC, Madrid, Spain";
