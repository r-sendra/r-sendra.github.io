// -----------------------------------------------------------------------------
// Publications. Newest first. Add a new entry at the top when you publish.
//
// Each paper shows three action buttons:
//   • Journal  → opens `link` (DOI / publisher URL). Fill this in.
//   • BibTeX   → expands the `bibtex` string in-place.
//   • GitHub   → opens `github` (code repository). Fill this in.
// Journal / GitHub buttons appear disabled until you add the URL.
//
// `abstract` is optional and kept for reference / future use.
// `paperPage` links the title to an in-site divulgative MDX page.
// -----------------------------------------------------------------------------

export type Publication = {
  title: string;
  authors: string;
  venue: string;
  year: number;
  type?: "journal" | "conference" | "chapter" | "thesis" | "preprint";
  link?: string; // Journal / DOI URL
  github?: string; // Code repository URL
  bibtex?: string;
  paperPage?: string; // e.g. "/papers/transferable-communication"
  abstract?: string;
};

export const publications: Publication[] = [
  {
    title:
      "Lexical discovery in unknown environments orchestrated by Large Language Models",
    authors:
      "R. Sendra-Arranz, I. Dellibarda Varela, E. Rocon, Á. Gutiérrez, M. Cebrian",
    venue: "arXiv:2607.22591 (cs.AI)",
    year: 2026,
    type: "preprint",
    link: "https://arxiv.org/abs/2607.22591",
    github: "",
    paperPage: "/posts/lexical-discovery/",
    abstract:
      "Populations of autonomous agents deployed in unknown environments (e.g. planetary or deep-sea exploration) must develop shared vocabularies to refer to entities that have no name in any human language. We propose the Neuro-Symbolic Lexical Discovery (NSLD) framework, in which a population of LLM-based agents plays a referential game over out-of-distribution visual referents, autonomously self-organising a shared alien lexicon. Each agent combines a frozen CLIP vision encoder with a private FAISS vector index and a text-only LLM. Discovered alien words are anchored to natural language via semantic proximity in the embedding space, enlarging the human vocabulary with new perceptually grounded words. Consensus is reached with populations of up to twenty agents and ten visual referents, and convergence dynamics are characterised through three analytical models achieving R² > 0.95.",
    bibtex: `@misc{sendra2026lexical,
  title         = {Lexical discovery in unknown environments orchestrated by Large Language Models},
  author        = {Sendra-Arranz, Rafael and Dellibarda Varela, I\\~naki and Rocon, Eduardo and Guti\\'errez, \\'Alvaro and Cebrian, Manuel},
  year          = {2026},
  eprint        = {2607.22591},
  archivePrefix = {arXiv},
  primaryClass  = {cs.AI}
}`,
  },
  {
    title:
      "POIROT: Interrogating Agents for Failure Detection in Multi-Agent Systems",
    authors:
      "I. Dellibarda Varela, R. Sendra-Arranz, P. Romero-Sorozabal, J. M. Valverde-García, A. F. Laudanski, Á. Gutiérrez, E. Rocon, M. Cebrian",
    venue: "arXiv:2606.02282 (cs.AI)",
    year: 2026,
    type: "preprint",
    link: "https://arxiv.org/abs/2606.02282",
    github: "https://github.com/11inaki11/POIROT",
    paperPage: "https://www.poirot-framework.com/",
    abstract:
      "Emergent failures and hallucinations in Large Language Model multi-agent systems are addressed by POIROT, a protocol that leverages the system's own agents as diagnostic evaluators. The approach outperforms single-LLM evaluator baselines, with gains that scale with problem complexity, showing that safety oversight can be handled internally rather than by external evaluators. The authors release an open-source POIROT library and BLAME, a benchmark for fault attribution in safety-critical systems.",
    bibtex: `@misc{dellibarda2026poirot,
  title         = {POIROT: Interrogating Agents for Failure Detection in Multi-Agent Systems},
  author        = {Dellibarda Varela, I\\~naki and Sendra-Arranz, Rafael and Romero-Sorozabal, Pablo and Valverde-Garc\\'ia, J.M. and Laudanski, Annemarie F. and Guti\\'errez, \\'Alvaro and Rocon, Eduardo and Cebrian, Manuel},
  year          = {2026},
  eprint        = {2606.02282},
  archivePrefix = {arXiv},
  primaryClass  = {cs.AI}
}`,
  },
  {
    title:
      "Cultural evolution of perceptually grounded compositional lexicons in swarm robotics systems",
    authors: "R. Sendra-Arranz, Á. Gutiérrez",
    venue: "Applied Soft Computing",
    year: 2026,
    type: "journal",
    link: "https://doi.org/10.1016/j.asoc.2026.115879",
    github: "",
    paperPage: "/posts/swarm-language/",
    abstract:
      "We show that robot swarms can self-organize a compositional lexicon to refer to multiple types of objects, with all swarm members converging to the exact same set of words. The system is based on cultural evolution, language games, semiotics and the principle of embodiment, ensuring that words and meanings are perceptually grounded in each robot's sensory experience. We demonstrate that swarms of up to 100 robots can achieve a common lexicon of 26 different words, and that compositionality of the lexicon is shared by all robots even though individual meanings and compositional rules remain private to each agent.",
    bibtex: `@article{sendra2026cultural,
  title   = {Cultural evolution of perceptually grounded compositional lexicons in swarm robotics systems},
  author  = {Sendra-Arranz, Rafael and Guti\\'errez, \\'Alvaro},
  journal = {Applied Soft Computing},
  year    = {2026},
  doi     = {10.1016/j.asoc.2026.115879}
}`,
  },
  {
    title:
      "Evolution of Transferable and Self-Organized Communication Modules for Solving Multiple Swarm Robotics Tasks",
    authors: "R. Sendra-Arranz, Á. Gutiérrez, A. L. Christensen",
    venue: "IEEE Transactions on Cybernetics",
    year: 2026,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{sendra2026transferable,
  title   = {Evolution of Transferable and Self-Organized Communication Modules for Solving Multiple Swarm Robotics Tasks},
  author  = {Sendra-Arranz, Rafael and Guti\\'errez, \\'Alvaro and Christensen, Anders Lyhne},
  journal = {IEEE Transactions on Cybernetics},
  year    = {2026}
}`,
  },
  {
    title:
      "Emergence of flocking behaviors transferring previously evolved alignment robot controllers",
    authors: "R. Sendra-Arranz, Á. Gutiérrez",
    venue: "Evolving Systems",
    year: 2025,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{sendra2025flocking,
  title   = {Emergence of flocking behaviors transferring previously evolved alignment robot controllers},
  author  = {Sendra-Arranz, Rafael and Guti\\'errez, \\'Alvaro},
  journal = {Evolving Systems},
  year    = {2025}
}`,
  },
  {
    title:
      "Emergence of Communication Through Artificial Evolution in an Orientation Consensus Task",
    authors: "R. Sendra-Arranz, Á. Gutiérrez",
    venue: "Book chapter",
    year: 2023,
    type: "chapter",
    link: "",
    github: "",
    bibtex: `@incollection{sendra2023orientation,
  title     = {Emergence of Communication Through Artificial Evolution in an Orientation Consensus Task},
  author    = {Sendra-Arranz, Rafael and Guti\\'errez, \\'Alvaro},
  booktitle = {Book chapter},
  year      = {2023}
}`,
  },
  {
    title:
      "Classification of Kinematic and Electromyographic Signals Associated with Pathological Tremor Using Machine and Deep Learning",
    authors:
      "A. Pascual-Valdunciel, V. Lopo-Martínez, A. J. Beltrán-Carrero, R. Sendra-Arranz, et al.",
    venue: "Entropy",
    year: 2023,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{pascual2023classification,
  title   = {Classification of Kinematic and Electromyographic Signals Associated with Pathological Tremor Using Machine and Deep Learning},
  author  = {Pascual-Valdunciel, Alejandro and Lopo-Mart\\'inez, V\\'ictor and Beltr\\'an-Carrero, Antonio J. and Sendra-Arranz, Rafael and others},
  journal = {Entropy},
  year    = {2023}
}`,
    abstract:
      "Peripheral Electrical Stimulation (PES) of afferent pathways has received increased interest as a solution to reduce pathological tremors with minimal side effects. This study explores machine-learning (K-Nearest Neighbors, Random Forest, Support Vector Machines) and deep-learning (LSTM) models to provide a binary (Tremor / No Tremor) classification of kinematic and electromyography (EMG) signals from patients with essential tremor and healthy subjects. All models showed high classification scores (f1 from 0.8 to 0.99); the LSTM models achieved 0.98 f1 on raw EMG.",
  },
  {
    title:
      "Prediction of Pathological Tremor Signals Using Long Short-Term Memory Neural Networks",
    authors: "A. Pascual-Valdunciel, V. Lopo-Martínez, R. Sendra-Arranz, et al.",
    venue: "IEEE Journal of Biomedical and Health Informatics",
    year: 2022,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{pascual2022prediction,
  title   = {Prediction of Pathological Tremor Signals Using Long Short-Term Memory Neural Networks},
  author  = {Pascual-Valdunciel, Alejandro and Lopo-Mart\\'inez, V\\'ictor and Sendra-Arranz, Rafael and others},
  journal = {IEEE Journal of Biomedical and Health Informatics},
  year    = {2022}
}`,
    abstract:
      "We tested long short-term memory (LSTM) neural networks to predict tremor signals using kinematic data from 12 Essential Tremor patients. Predicted signals showed high correlation with expected values (0.709–0.998) and a phase delay below 15 ms, outperforming previous studies (32–56% decreased phase-prediction error vs. the out-of-phase method).",
  },
  {
    title:
      "Evolution of Situated and Abstract Communication in Leader Selection and Borderline Identification Swarm Robotics Problems",
    authors: "R. Sendra-Arranz, Á. Gutiérrez",
    venue: "Applied Sciences",
    year: 2021,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{sendra2021situated,
  title   = {Evolution of Situated and Abstract Communication in Leader Selection and Borderline Identification Swarm Robotics Problems},
  author  = {Sendra-Arranz, Rafael and Guti\\'errez, \\'Alvaro},
  journal = {Applied Sciences},
  year    = {2021}
}`,
    abstract:
      "We analyze how an identical continuous-time recurrent neural network (CTRNN) controller can lead to the emergence of different kinds of communication within a swarm — abstract or situated — depending on the problem. An abstract communication emerges in leader selection, while a purely situated communication emerges for borderline identification. Scalability and robustness are successfully validated.",
  },
  {
    title: "Long short-term memory neural network for glucose prediction",
    authors:
      "J. Carrillo-Moreno, C. Pérez-Gandía, R. Sendra-Arranz, G. García-Sáez, M. E. Hernando, Á. Gutiérrez",
    venue: "Neural Computing and Applications",
    year: 2021,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{carrillo2021glucose,
  title   = {Long short-term memory neural network for glucose prediction},
  author  = {Carrillo-Moreno, Jaime and P\\'erez-Gand\\'ia, Carmen and Sendra-Arranz, Rafael and Garc\\'ia-S\\'aez, Gema and Hernando, M. Elena and Guti\\'errez, \\'Alvaro},
  journal = {Neural Computing and Applications},
  year    = {2021}
}`,
    abstract:
      "A glucose predictor based on LSTM neural networks fed by past glucose levels, insulin units and carbohydrate intake. Results encourage the use of glucose predictions to avoid hypoglycemia, anticipate correction actions, and increase patients' quality of life.",
  },
  {
    title:
      "Monitorization and statistical analysis of south and west green walls in a retrofitted building in Madrid",
    authors:
      "R. Sendra-Arranz, V. Oquendo, L. Olivieri, F. Olivieri, C. Bedoya, Á. Gutiérrez",
    venue: "Building and Environment",
    year: 2020,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{sendra2020greenwalls,
  title   = {Monitorization and statistical analysis of south and west green walls in a retrofitted building in Madrid},
  author  = {Sendra-Arranz, Rafael and Oquendo, V\\'ictor and Olivieri, Lorenzo and Olivieri, Francesca and Bedoya, C\\'esar and Guti\\'errez, \\'Alvaro},
  journal = {Building and Environment},
  year    = {2020}
}`,
    abstract:
      "Three years of real-time monitoring analyze how green-wall orientation reduces surface temperatures in a Mediterranean climate. On average the control temperature exceeds the green-wall temperature, with maximum differences of 20 °C in summer and 8 °C in winter on the south wall.",
  },
  {
    title:
      "A long short-term memory artificial neural network to predict daily HVAC consumption in buildings",
    authors: "R. Sendra-Arranz, Á. Gutiérrez",
    venue: "Energy and Buildings",
    year: 2020,
    type: "journal",
    link: "",
    github: "",
    bibtex: `@article{sendra2020hvac,
  title   = {A long short-term memory artificial neural network to predict daily HVAC consumption in buildings},
  author  = {Sendra-Arranz, Rafael and Guti\\'errez, \\'Alvaro},
  journal = {Energy and Buildings},
  volume  = {216},
  year    = {2020}
}`,
    abstract:
      "An LSTM-based predictor forecasts a day ahead of a building's HVAC power consumption at MagicBox, a self-sufficient solar house. Day-ahead prediction reaches a test NRMSE of 0.13 and correlation of 0.797; one-hour-ahead reaches NRMSE 0.052 and Pearson correlation 0.972.",
  },
];
