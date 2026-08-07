// The left-hand menu.
//
// Each group below is a top-level accordion. The sections listed inside it are
// the sub-headings that appear when you open it. A page lands in a section via
// the `section:` line at the top of its markdown file.
//
// A section only shows up once it has at least one page, so a group with no
// pages yet simply reads "Nothing here yet".
//
// To add a section: add its name to the right group here, AND to the list in
// public/admin/config.yml so editors can pick it in the web editor.
// `links` are fixed pages (built by hand rather than from a markdown file).
// They appear at the top of their group, above the sections.
export const NAV_GROUPS: {
  label: string;
  sections: string[];
  links?: { href: string; label: string }[];
  openByDefault?: boolean;
}[] = [
  {
    label: 'Shop',
    links: [{ href: '/shop/', label: 'In-Store Pickups' }],
    sections: [
      'Opening & Closing',
      'Till & Payments',
      'Customer Service',
      'Events & In-Store Gaming',
    ],
  },
  {
    label: 'Warehouse',
    sections: [
      'Goods In & Deliveries',
      'Stock & Suppliers',
      'Picking & Packing',
    ],
  },
  {
    label: 'Policies',
    openByDefault: true,
    sections: [
      'Start Here',
      'HR & People',
      'Health & Safety',
      'Data & IT',
      'Security & Conduct',
    ],
  },
  {
    label: 'Procedures',
    sections: [
      'Shopify & Online Orders',
      'Marketing',
    ],
  },
];

// The flat running order of every section, used by the home page.
export const SECTION_ORDER: string[] = NAV_GROUPS.flatMap((group) => group.sections);
