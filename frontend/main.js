const API_URL = "https://dodge-ai-intelligence.onrender.com";
let cy;

const typeColor = {
  customer:   '#06b6d4',
  salesOrder: '#3b82f6',
  delivery:   '#8b5cf6',
  billing:    '#f59e0b',
  payment:    '#10b981',
  journal:    '#475569',
};

const typeSize = {
  customer:   52,
  salesOrder: 36,
  delivery:   32,
  billing:    34,
  payment:    30,
  journal:    26,
};

function initCytoscape(elements) {
  cy = cytoscape({
    container: document.getElementById('cy'),
    elements,
    style: [
      {
        selector: 'node',
        style: {
          'width': (el) => typeSize[el.data('type')] || 30,
          'height': (el) => typeSize[el.data('type')] || 30,
          'background-color': (el) => typeColor[el.data('type')] || '#475569',
          'label': 'data(label)',
          'font-size': '9px',
          'font-family': 'JetBrains Mono, monospace',
          'color': '#94a3b8',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': 4,
          'text-max-width': '90px',
          'text-wrap': 'ellipsis',
          'border-width': 2,
          'border-color': (el) => typeColor[el.data('type')] || '#475569',
          'border-opacity': 0.3,
          'transition-property': 'background-color, border-color, border-opacity, width, height',
          'transition-duration': '0.15s',
        }
      },
      {
        selector: 'node[type="customer"]',
        style: {
          'shape': 'ellipse',
          'border-width': 3,
          'border-opacity': 0.7,
          'font-size': '10px',
          'color': '#cbd5e1',
        }
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-opacity': 1,
          'border-color': '#fff',
          'background-color': '#fff',
        }
      },
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 3,
          'border-opacity': 1,
        }
      },
      {
        selector: 'node.faded',
        style: { 'opacity': 0.15 }
      },
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': '#1e2330',
          'target-arrow-color': '#1e2330',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          'arrow-scale': 0.6,
          'label': '',
          'font-size': '8px',
          'color': '#475569',
          'font-family': 'JetBrains Mono, monospace',
          'text-background-color': '#111318',
          'text-background-opacity': 0.8,
          'text-background-padding': '2px',
          'opacity': 0.6,
        }
      },
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': '#334155',
          'target-arrow-color': '#334155',
          'opacity': 1,
          'width': 1.5,
        }
      },
      {
        selector: 'edge.faded',
        style: { 'opacity': 0.05 }
      },
    ],
    layout: { name: 'preset' },
    wheelSensitivity: 0.3,
    minZoom: 0.05,
    maxZoom: 4,
  });

  const tooltip = document.getElementById('tooltip');
  cy.on('mouseover', 'node', function(e) {
    const node = e.target;
    const d = node.data();
    const pos = e.renderedPosition || { x: 0, y: 0 };
    const container = cy.container().getBoundingClientRect();

    let rows = '';
    if (d.amount)    rows += `<div class="tooltip-row"><span>Amount</span><span>${Number(d.amount).toLocaleString('en-IN', {minimumFractionDigits:2})} ${d.currency||''}</span></div>`;
    if (d.status)    rows += `<div class="tooltip-row"><span>Status</span><span>${d.status}</span></div>`;
    if (d.cancelled !== undefined) rows += `<div class="tooltip-row"><span>Cancelled</span><span>${d.cancelled ? '⚠ Yes' : '✓ No'}</span></div>`;
    if (d.clearedOn) rows += `<div class="tooltip-row"><span>Cleared</span><span>${new Date(d.clearedOn).toLocaleDateString('en-GB')}</span></div>`;
    if (d.postedOn)  rows += `<div class="tooltip-row"><span>Posted</span><span>${new Date(d.postedOn).toLocaleDateString('en-GB')}</span></div>`;

    tooltip.innerHTML = `
      <div class="tooltip-type">${d.type}</div>
      <div class="tooltip-label">${d.label}</div>
      ${rows || '<div style="color:var(--text-dim);font-size:10px">No additional data</div>'}
    `;
    tooltip.style.display = 'block';
    tooltip.style.left = (container.left + pos.x + 16) + 'px';
    tooltip.style.top  = (container.top  + pos.y - 10) + 'px';
  });

  cy.on('mouseout', 'node', () => { tooltip.style.display = 'none'; });

  cy.on('tap', 'node', function(e) {
    const node = e.target;
    cy.elements().removeClass('highlighted faded');
    const neighbourhood = node.closedNeighborhood();
    neighbourhood.addClass('highlighted');
    cy.elements().not(neighbourhood).addClass('faded');
    document.getElementById('filterBtn').style.borderColor = 'var(--accent)';
    document.getElementById('filterBtn').style.color = 'var(--accent)';
  });

  cy.on('tap', function(e) {
    if (e.target === cy) resetFilter();
  });

  document.getElementById('statNodes').textContent = cy.nodes().length.toLocaleString();
  document.getElementById('statEdges').textContent = cy.edges().length.toLocaleString();
}

function runLayout() {
  if (!cy) return;
  cy.layout({
    name: 'cose',
    animate: true,
    animationDuration: 800,
    animationEasing: 'ease-out',
    randomize: false,
    nodeRepulsion: () => 8500,
    idealEdgeLength: () => 80,
    edgeElasticity: () => 200,
    nestingFactor: 1.2,
    gravity: 0.25,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.97,
    minTemp: 1,
    padding: 30,
  }).run();
}

function resetFilter() {
  if (!cy) return;
  cy.elements().removeClass('highlighted faded');
  document.getElementById('filterBtn').style.borderColor = '';
  document.getElementById('filterBtn').style.color = '';
}

async function loadGraph() {
  try {
    const res = await fetch(`${API}/api/graph`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const elements = [
      ...data.nodes.map(n => ({ data: n.data })),
      ...data.edges.map(e => ({ data: e.data })),
    ];

    const byType = {};
    data.nodes.forEach(n => {
      const t = n.data.type;
      if (!byType[t]) byType[t] = [];
      byType[t].push(n.data.id);
    });

    const tierAngles = {
      customer:   { r: 150 },
      salesOrder: { r: 350 },
      delivery:   { r: 550 },
      billing:    { r: 750 },
      payment:    { r: 950 },
      journal:    { r: 1050 },
    };

    const order = ['customer','salesOrder','delivery','billing','payment','journal'];
    const posMap = {};
    order.forEach((type, ti) => {
      const ids = byType[type] || [];
      ids.forEach((id, i) => {
        const angle = (i / Math.max(ids.length,1)) * 2 * Math.PI;
        const r = tierAngles[type]?.r || 300 + ti * 200;
        posMap[id] = { x: r * Math.cos(angle), y: r * Math.sin(angle) };
      });
    });

    const positioned = elements.map(el => {
      if (el.data.source) return el;
      return { ...el, position: posMap[el.data.id] || { x: 0, y: 0 } };
    });

    initCytoscape(positioned);
    runLayout();

    document.getElementById('graphLoading').style.display = 'none';
    document.getElementById('statusBadge').textContent = 'Live';

  } catch (err) {
    document.getElementById('graphLoading').innerHTML = `
      <div style="color:#ef4444;font-family:var(--mono);font-size:12px;text-align:center;padding:20px">
        ⚠ Failed to load graph<br>
        <span style="color:var(--text-dim);font-size:10px;margin-top:6px;display:block">Is the backend running on port 5000?</span>
        <button class="ctrl-btn" onclick="loadGraph()" style="margin-top:12px;pointer-events:all">Retry</button>
      </div>`;
    document.getElementById('statusBadge').textContent = 'Offline';
    document.getElementById('statusBadge').style.cssText = 'border-color:rgba(239,68,68,0.4);color:#ef4444;background:rgba(239,68,68,0.08)';
  }
}

let isThinking = false;

function sendSuggestion(btn) {
  document.getElementById('chatInput').value = btn.textContent;
  sendMessage();
}

function showGreeting() {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg greeting';
  div.innerHTML = `
    <div class="msg-label">Dodge Assistant</div>
    <div class="msg-bubble">
      <div class="chat-line">👋 Hello! I'm your SAP Order-to-Cash intelligence assistant.</div>
      <div class="chat-line" style="margin-top:6px">I can help you explore and analyze your Dodge data — sales orders, deliveries, invoices, payments, customers, and products.</div>
      <div class="chat-line" style="margin-top:6px;color:var(--text-dim)">Try a quick query on the left, or ask me anything about the dataset.</div>
    </div>`;
  msgs.appendChild(div);
}

function addMessage(role, content) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;

  const label = role === 'user' ? 'You' : 'Dodge Assistant';
  const isError = typeof content === 'string' && content.startsWith('⚠');
  const formattedContent = formatChatContent(content);

  div.innerHTML = `
    <div class="msg-label">${label}</div>
    <div class="msg-bubble ${isError ? 'error' : ''}">${formattedContent}</div>`;

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addTyping() {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = 'msg assistant';
  div.id = 'typing';
  div.innerHTML = `
    <div class="msg-label">Dodge AI Assistant</div>
    <div class="msg-bubble">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function formatChatContent(content) {
  if (!content) return '';
  const lines = String(content).split('\n').filter(l => l.trim());
  return lines.map(line => {
    const escaped = line
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return `<div class="chat-line">${escaped}</div>`;
  }).join('');
}

async function highlightReferencedNodes(answerText) {
  if (!cy) return;
  cy.elements().removeClass('highlighted faded');

  const matchedIds = new Set();

  const numericPatterns = [
    { regex: /\b(7\d{5})\b/g,     prefix: 'so_' },
    { regex: /\b(9\d{7})\b/g,     prefix: 'bill_' },
    { regex: /\b(8\d{7})\b/g,     prefix: 'del_' },
    { regex: /\b(3[12]\d{7})\b/g, prefix: 'bp_' },
  ];
  numericPatterns.forEach(({ regex, prefix }) => {
    let match;
    while ((match = regex.exec(answerText)) !== null) {
      matchedIds.add(`${prefix}${match[1]}`);
    }
  });

  const nameRegex = /Business Partner(?:\s+Full\s+Name)?:\s*([^|]+?)(?:\s*\||\s*\n|$)/gi;
  const customerNames = [];
  let nm;
  while ((nm = nameRegex.exec(answerText)) !== null) {
    const name = nm[1].trim();
    if (name && name.length > 2) customerNames.push(name);
  }
  if (customerNames.length > 0) {
    try {
      const res = await fetch(`${API}/api/graph/nodes-for-customers?names=${encodeURIComponent(customerNames.join('|'))}`);
      const data = await res.json();
      data.nodeIds?.forEach(id => matchedIds.add(id));
    } catch(e) {}
  }

  const materialRegex = /\b([A-Z]\d{13})\b/g;
  const materials = [];
  let mt;
  while ((mt = materialRegex.exec(answerText)) !== null) {
    materials.push(mt[1]);
  }
  if (materials.length > 0) {
    try {
      const res = await fetch(`${API}/api/graph/nodes-for-materials?materials=${materials.join(',')}`);
      const data = await res.json();
      data.nodeIds?.forEach(id => matchedIds.add(id));
    } catch(e) {}
  }

  if (matchedIds.size === 0) return;

  const matched = cy.nodes().filter(n => matchedIds.has(n.data('id')));
  if (matched.length === 0) return;

  const neighbourhood = matched.closedNeighborhood();
  neighbourhood.addClass('highlighted');
  cy.elements().not(neighbourhood).addClass('faded');

  cy.animate({
    fit: { eles: matched, padding: 100 },
    duration: 600,
    easing: 'ease-in-out'
  });

  document.getElementById('filterBtn').style.borderColor = 'var(--accent)';
  document.getElementById('filterBtn').style.color = 'var(--accent)';
}

async function sendMessage() {
  if (isThinking) return;
  const input = document.getElementById('chatInput');
  const question = input.value.trim();
  if (!question) return;

  isThinking = true;
  input.value = '';
  input.style.height = 'auto';
  document.getElementById('sendBtn').disabled = true;

  addMessage('user', question);
  const typingEl = addTyping();

  try {
    const res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    typingEl.remove();

    if (data.error) {
      addMessage('assistant', `⚠ ${data.error}`);
    } else {
      addMessage('assistant', data.answer);
      if (data.answer && cy) {
        highlightReferencedNodes(data.answer);
      }
    }
  } catch (err) {
    typingEl.remove();
    addMessage('assistant', '⚠ Could not reach the backend. Make sure the server is running on port 5000.');
  }

  isThinking = false;
  document.getElementById('sendBtn').disabled = false;
  input.focus();
}

document.getElementById('chatInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

document.getElementById('chatInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

showGreeting();
loadGraph();