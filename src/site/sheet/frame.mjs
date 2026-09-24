/** The drawing-sheet frame every page of the set shares: border zones and the header rail (brand links to Sheet 0). */
const zones = (n, rev) => Array.from({ length: n }, (_, i) => `<span>${rev ? n - i : String.fromCharCode(65 + i)}</span>`).join('');

/** The drawn way back to Sheet 0: the outline sibling of the primary button, at the start of the rail. */
export const back = (base) => `<a class="back" href="${base}"><svg viewBox="0 0 22 12" aria-hidden="true"><path d="M21 6H2M7 1 2 6l5 5"/></svg>Sheet 0</a>`;

/** `label` names this sheet; `lead` and `right` are trusted markup for the rail's two ends. */
export const frame = ({ base, name, label, right, lead = '' }) => `<div class="zones zt" aria-hidden="true">${zones(8, true)}</div><div class="zones zb" aria-hidden="true">${zones(8, true)}</div>
<div class="zones zl" aria-hidden="true">${zones(6)}</div><div class="zones zr" aria-hidden="true">${zones(6)}</div>
<header class="top">${lead}<a class="mark" href="${base}">${name}</a><span class="sh0">${label}</span>
${right}</header>`;
