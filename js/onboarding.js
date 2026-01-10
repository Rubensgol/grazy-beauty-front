/**
 * Onboarding Wizard - Configuração inicial do tenant
 * Sistema White Label Multi-Tenant
 */

import { apiUrl } from './configuracao/config.js';
import { fetchWithAuth } from './configuracao/http.js';
import { saveTenantConfig, uploadLogo } from './configuracao/tenant-config.js';

// Estado do wizard
const wizardState = {
  currentStep: 1,
  totalSteps: 4,
  config: {
    primaryColor: '#b5879d',
    logoFile: null,
    logoUrl: null,
    service: {
      name: '',
      price: 0,
      duration: 60,
      description: ''
    }
  }
};

// =====================
// ELEMENTOS DOM
// =====================
const elements = {
  steps: document.querySelectorAll('.wizard-step'),
  stepIndicators: document.querySelectorAll('.step-indicator'),
  stepLines: document.querySelectorAll('.step-line'),
  currentStepText: document.getElementById('current-step'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  btnSkip: document.getElementById('btn-skip'),
  // Step 1
  colorOptions: document.querySelectorAll('.color-option'),
  customColor: document.getElementById('custom-color'),
  colorHex: document.getElementById('color-hex'),
  previewHeader: document.getElementById('preview-header'),
  previewBtn: document.getElementById('preview-btn'),
  // Step 2
  logoUploadArea: document.getElementById('logo-upload-area'),
  logoInput: document.getElementById('logo-input'),
  uploadPlaceholder: document.getElementById('upload-placeholder'),
  uploadPreview: document.getElementById('upload-preview'),
  logoPreviewImg: document.getElementById('logo-preview-img'),
  removeLogo: document.getElementById('remove-logo'),
  headerLogoPreview: document.getElementById('header-logo-preview'),
  previewHeader2: document.getElementById('preview-header-2'),
  // Step 3
  serviceForm: document.getElementById('service-form'),
  previewServiceName: document.getElementById('preview-service-name'),
  previewServicePrice: document.getElementById('preview-service-price'),
  previewServiceDuration: document.getElementById('preview-service-duration'),
  previewServiceDesc: document.getElementById('preview-service-desc'),
  previewServiceBtn: document.getElementById('preview-service-btn'),
  // Step 4
  summaryColor: document.getElementById('summary-color'),
  summaryColorHex: document.getElementById('summary-color-hex'),
  summaryLogo: document.getElementById('summary-logo'),
  summaryService: document.getElementById('summary-service'),
  btnGoToPanel: document.getElementById('btn-go-to-panel')
};

// =====================
// NAVIGATION
// =====================

function updateStepUI() {
  // Update step indicators
  elements.stepIndicators.forEach((indicator, index) => {
    const stepNum = index + 1;
    indicator.classList.remove('active', 'completed', 'pending');
    
    if (stepNum < wizardState.currentStep) {
      indicator.classList.add('completed');
      indicator.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (stepNum === wizardState.currentStep) {
      indicator.classList.add('active');
      indicator.textContent = stepNum;
    } else {
      indicator.classList.add('pending');
      indicator.textContent = stepNum;
    }
  });
  
  // Update step lines
  elements.stepLines.forEach((line, index) => {
    const lineNum = index + 1;
    if (lineNum < wizardState.currentStep) {
      line.classList.add('completed');
    } else {
      line.classList.remove('completed');
    }
  });
  
  // Update step content
  elements.steps.forEach(step => {
    step.classList.remove('active');
    if (parseInt(step.dataset.step) === wizardState.currentStep) {
      step.classList.add('active');
    }
  });
  
  // Update counter
  elements.currentStepText.textContent = wizardState.currentStep;
  
  // Update buttons
  elements.btnPrev.disabled = wizardState.currentStep === 1;
  
  if (wizardState.currentStep === wizardState.totalSteps) {
    elements.btnNext.classList.add('hidden');
    elements.btnSkip.classList.add('hidden');
  } else {
    elements.btnNext.classList.remove('hidden');
    elements.btnSkip.classList.remove('hidden');
  }
  
  // Show/hide skip based on step
  if (wizardState.currentStep === 1) {
    elements.btnSkip.classList.add('hidden');
  }
}

function goToStep(step) {
  if (step < 1 || step > wizardState.totalSteps) return;
  
  wizardState.currentStep = step;
  updateStepUI();
  
  // Special handling for final step
  if (step === wizardState.totalSteps) {
    updateSummary();
  }
}

function nextStep() {
  if (wizardState.currentStep < wizardState.totalSteps) {
    // Validate current step before proceeding
    if (!validateCurrentStep()) return;
    
    goToStep(wizardState.currentStep + 1);
  }
}

function prevStep() {
  if (wizardState.currentStep > 1) {
    goToStep(wizardState.currentStep - 1);
  }
}

function skipStep() {
  nextStep();
}

function validateCurrentStep() {
  switch (wizardState.currentStep) {
    case 1:
      // Color is always valid (has default)
      return true;
    case 2:
      // Logo is optional
      return true;
    case 3:
      // Service name and price are required for step 3
      const form = elements.serviceForm;
      const name = form.querySelector('[name="serviceName"]').value.trim();
      const price = form.querySelector('[name="servicePrice"]').value;
      const duration = form.querySelector('[name="serviceDuration"]').value;
      
      if (!name || !price || !duration) {
        // Allow skip
        return true;
      }
      
      // Save service data
      wizardState.config.service = {
        name,
        price: parseFloat(price),
        duration: parseInt(duration),
        description: form.querySelector('[name="serviceDescription"]').value.trim()
      };
      return true;
    default:
      return true;
  }
}

// =====================
// COLOR PICKER (Step 1)
// =====================

function updateColor(color) {
  wizardState.config.primaryColor = color;
  
  // Update CSS variable
  document.documentElement.style.setProperty('--wizard-primary', color);
  
  // Update hex input
  elements.colorHex.value = color;
  elements.customColor.value = color;
  
  // Update selection UI
  elements.colorOptions.forEach(opt => {
    opt.classList.remove('selected');
    if (opt.dataset.color === color) {
      opt.classList.add('selected');
    }
  });
  
  // Update previews
  elements.previewHeader.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 30)} 100%)`;
  elements.previewBtn.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 30)} 100%)`;
  
  if (elements.previewHeader2) {
    elements.previewHeader2.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 30)} 100%)`;
  }
  
  if (elements.previewServiceBtn) {
    elements.previewServiceBtn.style.background = `linear-gradient(135deg, ${color} 0%, ${lightenColor(color, 30)} 100%)`;
  }
}

function lightenColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (
    0x1000000 +
    (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)
  ).toString(16).slice(1);
}

// =====================
// LOGO UPLOAD (Step 2)
// =====================

function handleLogoUpload(file) {
  if (!file) return;
  
  // Validate file
  if (!file.type.match(/image\/(png|jpeg|jpg|svg\+xml)/)) {
    alert('Por favor, selecione uma imagem PNG, JPG ou SVG.');
    return;
  }
  
  if (file.size > 2 * 1024 * 1024) {
    alert('A imagem deve ter no máximo 2MB.');
    return;
  }
  
  wizardState.config.logoFile = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    wizardState.config.logoUrl = e.target.result;
    elements.logoPreviewImg.src = e.target.result;
    elements.uploadPlaceholder.classList.add('hidden');
    elements.uploadPreview.classList.remove('hidden');
    
    // Update header preview
    elements.headerLogoPreview.innerHTML = `<img src="${e.target.result}" alt="Logo" class="w-full h-full object-contain rounded-xl">`;
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  wizardState.config.logoFile = null;
  wizardState.config.logoUrl = null;
  elements.logoInput.value = '';
  elements.uploadPlaceholder.classList.remove('hidden');
  elements.uploadPreview.classList.add('hidden');
  elements.headerLogoPreview.innerHTML = `<span class="text-white font-bold">G</span>`;
}

// =====================
// SERVICE FORM (Step 3)
// =====================

function updateServicePreview() {
  const form = elements.serviceForm;
  const name = form.querySelector('[name="serviceName"]').value || 'NOME DO SERVIÇO';
  const price = parseFloat(form.querySelector('[name="servicePrice"]').value) || 0;
  const duration = form.querySelector('[name="serviceDuration"]').value || '60';
  const desc = form.querySelector('[name="serviceDescription"]').value || 'Descrição do serviço...';
  
  elements.previewServiceName.textContent = name.toUpperCase();
  elements.previewServicePrice.textContent = `R$ ${price.toFixed(2).replace('.', ',')}`;
  elements.previewServiceDuration.textContent = `${duration}min`;
  elements.previewServiceDesc.textContent = desc;
}

// =====================
// SUMMARY (Step 4)
// =====================

function updateSummary() {
  elements.summaryColor.style.background = wizardState.config.primaryColor;
  elements.summaryColorHex.textContent = wizardState.config.primaryColor;
  elements.summaryLogo.textContent = wizardState.config.logoFile ? 'Definida ✓' : 'Não definida';
  elements.summaryService.textContent = wizardState.config.service.name || 'Não cadastrado';
}

// =====================
// SAVE & FINISH
// =====================

async function saveConfiguration() {
  try {
    // Prepare data usando campos em inglês (será mapeado pelo tenant-config)
    const configData = {
      primaryColor: wizardState.config.primaryColor,
      onboardingCompleted: true
    };
    
    // Save config usando o serviço que faz o mapeamento para o backend
    await saveTenantConfig(configData);
    
    // Upload logo if exists usando o serviço centralizado
    if (wizardState.config.logoFile) {
      await uploadLogo(wizardState.config.logoFile);
    }
    
    // Create first service if filled
    if (wizardState.config.service.name) {
      await fetchWithAuth('/api/servicos', {
        method: 'POST',
        body: JSON.stringify({
          nome: wizardState.config.service.name,
          preco: wizardState.config.service.price,
          duracaoMinutos: wizardState.config.service.duration,
          descricao: wizardState.config.service.description,
          ativo: true
        })
      });
    }
    
    console.log('[onboarding] Configuração salva com sucesso');
    return true;
  } catch (err) {
    console.error('[onboarding] Erro ao salvar configuração:', err);
    // Continue anyway for development
    return true;
  }
}

function showConfetti() {
  const colors = [wizardState.config.primaryColor, '#10b981', '#f59e0b', '#ec4899'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 2 + 's';
    confetti.style.width = Math.random() * 10 + 5 + 'px';
    confetti.style.height = confetti.style.width;
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3000);
  }
}

async function finishOnboarding() {
  showConfetti();
  await saveConfiguration();
  
  // Mark onboarding as complete in localStorage
  localStorage.setItem('onboardingComplete', 'true');
  
  // Redirect to panel
  setTimeout(() => {
    window.location.href = '/painelAdm.html';
  }, 1500);
}

// =====================
// EVENT LISTENERS
// =====================

function setupEventListeners() {
  // Navigation
  elements.btnNext.addEventListener('click', nextStep);
  elements.btnPrev.addEventListener('click', prevStep);
  elements.btnSkip.addEventListener('click', skipStep);
  
  // Color picker
  elements.colorOptions.forEach(opt => {
    opt.addEventListener('click', () => updateColor(opt.dataset.color));
  });
  
  elements.customColor.addEventListener('input', (e) => {
    updateColor(e.target.value);
  });
  
  elements.colorHex.addEventListener('input', (e) => {
    const value = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateColor(value);
    }
  });
  
  // Logo upload
  elements.logoUploadArea.addEventListener('click', () => {
    elements.logoInput.click();
  });
  
  elements.logoInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleLogoUpload(e.target.files[0]);
    }
  });
  
  elements.logoUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.logoUploadArea.classList.add('dragover');
  });
  
  elements.logoUploadArea.addEventListener('dragleave', () => {
    elements.logoUploadArea.classList.remove('dragover');
  });
  
  elements.logoUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.logoUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) {
      handleLogoUpload(e.dataTransfer.files[0]);
    }
  });
  
  elements.removeLogo.addEventListener('click', (e) => {
    e.stopPropagation();
    removeLogo();
  });
  
  // Service form
  elements.serviceForm.querySelectorAll('input, textarea').forEach(input => {
    input.addEventListener('input', updateServicePreview);
  });
  
  // Finish
  elements.btnGoToPanel.addEventListener('click', finishOnboarding);
}

// =====================
// INIT
// =====================

async function checkOnboardingStatus() {
  try {
    const res = await fetchWithAuth('/api/config');
    if (res.ok) {
      const config = await res.json();
      const data = config.data || config;
      
      // If onboarding already completed, redirect to panel
      if (data.onboardingCompleted) {
        window.location.href = '/painelAdm.html';
        return false;
      }
      
      // Pre-fill existing config
      if (data.primaryColor) {
        wizardState.config.primaryColor = data.primaryColor;
        updateColor(data.primaryColor);
      }
      
      if (data.businessName) {
        document.getElementById('header-business-name').textContent = data.businessName;
        document.getElementById('header-name-preview').textContent = data.businessName;
      }
    }
  } catch (err) {
    console.log('[onboarding] Não foi possível verificar status, continuando...');
  }
  return true;
}

async function init() {
  console.log('[onboarding] Inicializando wizard de onboarding...');
  
  const shouldContinue = await checkOnboardingStatus();
  if (!shouldContinue) return;
  
  setupEventListeners();
  updateStepUI();
  updateColor(wizardState.config.primaryColor);
  
  console.log('[onboarding] Wizard pronto');
}

// Start
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
