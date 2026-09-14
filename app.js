const $ = selector => document.querySelector(selector);
const mail = $('#mailInput'), box = $('#resultBox'), state = $('#resultState');
const analyzeButton = $('#analyzeButton'), copyButton = $('#copyButton');
const samples = window.mailSamples;
let result = null;
const labels = {
  category: '문의 유형',
  partner_request: '거래처 요청',
  priority: '긴급도와 근거',
  due_date: '회신 기한',
  internal_owner: '내부 확인 부서',
  pre_reply_checks: '회신 전 체크리스트',
  risk_note: '주의할 표현',
  action_memo: '업무 메모',
  reply_ja: '일본어 답장 초안',
  reply_ko: '초안의 한국어 뜻'
};
mail.maxLength = 8000;
const resetResult = () => {
  result = null; copyButton.disabled = true; box.className = 'empty';
  box.textContent = '메일을 입력하고 AI 분석하기를 눌러 주세요.';
  state.textContent = '대기 중';
};
function count() { $('#charCount').textContent = `${mail.value.length.toLocaleString('ko-KR')} / 8,000자`; }
mail.addEventListener('input', () => {
  count(); resetResult();
  document.querySelectorAll('[data-sample]').forEach(b => { b.classList.remove('is-selected'); b.setAttribute('aria-pressed', 'false'); });
});
document.querySelectorAll('[data-sample]').forEach(button => button.addEventListener('click', () => {
  mail.value = samples[button.dataset.sample]; count(); resetResult();
  document.querySelectorAll('[data-sample]').forEach(b => { b.classList.toggle('is-selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
}));
$('#clearButton').addEventListener('click', () => { mail.value = ''; mail.dispatchEvent(new Event('input')); });
async function copy(text) {
  try { await navigator.clipboard.writeText(text); state.textContent = '복사 완료'; }
  catch { state.textContent = '복사하지 못했습니다. 내용을 선택해 복사해 주세요.'; }
}
copyButton.addEventListener('click', () => { if (result) copy(Object.entries(labels).map(([key, title]) => `${title}\n${result[key]}`).join('\n\n')); });
function render(data) {
  box.className = 'result'; box.replaceChildren();
  for (const [key, title] of Object.entries(labels)) {
    const section = document.createElement('section'); section.className = 'result-section';
    const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
    if (key === 'reply_ja') {
      const editor = document.createElement('textarea'); editor.value = data[key]; editor.setAttribute('aria-label', '일본어 답장 초안 수정');
      editor.style.cssText = 'height:260px;padding:12px;border:1px solid #ccd5e5;border-radius:8px';
      editor.addEventListener('input', () => { result.reply_ja = editor.value; state.textContent = '초안 수정됨 · 한국어 뜻은 수정 전 기준'; });
      const button = document.createElement('button'); button.className = 'secondary'; button.textContent = '답장만 복사';
      button.addEventListener('click', () => copy(editor.value)); section.append(editor, button);
    } else { const content = document.createElement('div'); content.textContent = data[key]; section.append(content); }
    box.append(section);
  }
}
analyzeButton.addEventListener('click', async () => {
  if (!mail.value.trim()) {
    state.textContent = '메일 입력 필요';
    box.className = 'empty';
    box.textContent = '아직 분석할 메일이 없어요. 위의 ‘납기 확인’ 샘플을 누르거나 왼쪽 입력란에 일본어 메일을 붙여넣은 다음, AI 분석하기를 눌러 주세요.';
    mail.focus();
    return;
  }
  resetResult();
  const controls = [mail, analyzeButton, $('#clearButton'), ...document.querySelectorAll('[data-sample]')];
  controls.forEach(el => el.disabled = true);
  state.textContent = 'AI 분석 중'; box.textContent = 'OpenAI가 요청사항과 회신 초안을 정리하고 있습니다…'; box.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mail: mail.value }), signal: AbortSignal.timeout(70000) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '분석에 실패했습니다.');
    result = data.result; render(result); copyButton.disabled = false; state.textContent = '실제 AI 분석 완료 · 검토 필요';
  } catch (error) {
    box.className = 'empty'; box.textContent = error.name === 'TimeoutError' ? '응답이 늦어지고 있습니다. 잠시 후 다시 시도해 주세요.' : error instanceof TypeError ? '서버 또는 API 연결을 확인해 주세요. 로컬에서는 start.cmd 실행이 필요합니다.' : error.message;
    state.textContent = '분석 실패';
  } finally { controls.forEach(el => el.disabled = false); box.setAttribute('aria-busy', 'false'); refreshStatus(); }
});
async function refreshStatus() {
  try {
    const response = await fetch('/api/status'); const data = await response.json();
    $('.demo-badge').textContent = data.configured ? 'API 키 설정됨' : 'API 키 설정 필요';
  } catch { $('.demo-badge').textContent = '서버 실행 필요'; }
}
window.addEventListener('focus', refreshStatus);
resetResult(); count(); refreshStatus();
