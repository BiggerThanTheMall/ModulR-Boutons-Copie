// ==UserScript==
// @name         Modulr – Boutons Copie Rapide
// @namespace    https://github.com/BiggerThanTheMall/tampermonkey-ltoa
// @version      2.0.0
// @description  Boutons de copie discrets : email, téléphone, adresse, devis, contrats
// @author       LTOA
// @match        https://courtage.modulr.fr/fr/scripts/clients/clients_card.php*
// @run-at       document-idle
// @grant        GM_setClipboard
// @grant        GM_addStyle

// @updateURL    https://raw.githubusercontent.com/BiggerThanTheMall/tampermonkey-ltoa/main/Modulr-Boutons-Copie-Rapide.user.js
// @downloadURL  https://raw.githubusercontent.com/BiggerThanTheMall/tampermonkey-ltoa/main/Modulr-Boutons-Copie-Rapide.user.js
// ==/UserScript==

(function() {
    'use strict';

    let isProcessing = false;

    // ========== STYLES ==========
    GM_addStyle(`
        .modulr-copy-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            margin-left: 4px;
            padding: 0;
            border: none;
            border-radius: 3px;
            background: transparent;
            color: #688396;
            cursor: pointer;
            opacity: 0.4;
            transition: all 0.2s ease;
            vertical-align: middle;
            font-size: 11px;
            flex-shrink: 0;
        }
        .modulr-copy-btn:hover {
            opacity: 1;
            background: rgba(104, 131, 150, 0.15);
            color: #215c7f;
        }
        .modulr-copy-btn:active {
            transform: scale(0.9);
        }
        .modulr-copy-btn.copied {
            opacity: 1;
            color: #28a745;
        }
        .modulr-copy-tooltip {
            position: fixed;
            padding: 5px 10px;
            background: #215c7f;
            color: white;
            font-size: 11px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 99999;
            pointer-events: none;
            animation: modulrFadeIn 0.15s ease;
        }
        @keyframes modulrFadeIn {
            from { opacity: 0; transform: translateY(3px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .modulr-addr-btns {
            display: inline-flex;
            gap: 3px;
            margin-left: 8px;
            vertical-align: middle;
        }
        .modulr-addr-btns .modulr-copy-btn {
            margin-left: 0;
        }
        /* Fix pour éviter le retour à la ligne sur email/tel */
        .vcard_bottom_line li {
            display: flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
        }
        .vcard_bottom_line li a {
            flex-shrink: 1;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    `);

    // ========== FONCTIONS ==========
    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text, 'text');
            return true;
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        return success;
    }

    function showTooltip(element, message) {
        const rect = element.getBoundingClientRect();
        const tooltip = document.createElement('div');
        tooltip.className = 'modulr-copy-tooltip';
        tooltip.textContent = message;
        document.body.appendChild(tooltip);
        tooltip.style.left = (rect.left + rect.width/2 - 25) + 'px';
        tooltip.style.top = (rect.top - 28) + 'px';
        setTimeout(() => {
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.2s';
            setTimeout(() => tooltip.remove(), 200);
        }, 1000);
    }

    // Nettoyer le texte (enlever l'âge "XX ans" à la fin)
function cleanText(text) {
    let cleaned = text.trim().replace(/\s+/g, ' ');
    // Si c'est une date JJ/MM/AAAA, extraire seulement la date
    const dateMatch = cleaned.match(/^(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch) return dateMatch[1];
    // Sinon enlever "XX ans" à la fin
    cleaned = cleaned.replace(/\s+\d{1,3}\s*ans?\s*$/i, '');
    return cleaned.trim();

    }

    function createCopyBtn(text, title) {
        const btn = document.createElement('button');
        btn.className = 'modulr-copy-btn';
        btn.setAttribute('data-modulr-copy', 'true');
        btn.title = title || 'Copier';
        btn.innerHTML = '<span class="fa fa-copy"></span>';
        btn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const cleanedText = cleanText(text);
            if (copyToClipboard(cleanedText)) {
                btn.classList.add('copied');
                btn.innerHTML = '<span class="fa fa-check"></span>';
                showTooltip(btn, 'Copié !');
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = '<span class="fa fa-copy"></span>';
                }, 1200);
            }
        };
        return btn;
    }

    // ========== AJOUT DES BOUTONS ==========
    function addCopyButtons() {
        if (isProcessing) return;
        isProcessing = true;

        try {
            // ===== EMAIL (dans vcard) =====
            document.querySelectorAll('.vcard_bottom_line a[href*="documents_send.php?mode=email"]').forEach(el => {
                if (el.nextElementSibling?.hasAttribute('data-modulr-copy')) return;
                const email = el.getAttribute('title') || el.textContent.trim();
                if (email && email.includes('@')) {
                    el.after(createCopyBtn(email, 'Copier l\'email'));
                }
            });

            // ===== TÉLÉPHONE (dans vcard) =====
            document.querySelectorAll('.vcard_bottom_line a[href^="tel:"]').forEach(el => {
                if (el.nextElementSibling?.hasAttribute('data-modulr-copy')) return;
                const phone = el.textContent.trim();
                if (phone) {
                    el.after(createCopyBtn(phone, 'Copier le téléphone'));
                }
            });

            // ===== ADRESSE (dans vcard) =====
            document.querySelectorAll('.vcard .address_block_content').forEach(el => {
                if (el.parentNode.querySelector('.modulr-addr-btns')) return;
                const lines = el.innerHTML.split('<br>').map(l => l.replace(/<[^>]*>/g, '').trim()).filter(l => l && l !== 'FRANCE');
                if (lines.length === 0) return;

                const container = document.createElement('span');
                container.className = 'modulr-addr-btns';

                const btnAll = createCopyBtn(lines.join(', '), 'Copier l\'adresse complète');
                container.appendChild(btnAll);

                if (lines[0]) {
                    const btnRue = createCopyBtn(lines[0], 'Copier la rue');
                    btnRue.innerHTML = '<span class="fa fa-road"></span>';
                    container.appendChild(btnRue);
                }

                if (lines[1]) {
                    const cpMatch = lines[1].match(/^(\d{5})\s+(.+)$/);
                    if (cpMatch) {
                        const btnCP = createCopyBtn(cpMatch[1], 'Copier le code postal');
                        btnCP.innerHTML = '<span class="fa fa-hashtag"></span>';
                        container.appendChild(btnCP);

                        const btnVille = createCopyBtn(cpMatch[2], 'Copier la ville');
                        btnVille.innerHTML = '<span class="fa fa-map-marker-alt"></span>';
                        container.appendChild(btnVille);
                    }
                }
                el.parentNode.appendChild(container);
            });

            // ===== TOUS LES CHAMPS D'INFO (car_template_field) =====
            document.querySelectorAll('.card_template_section .car_template_field').forEach(field => {
                const label = field.querySelector('p.normal_fade');
                const value = field.querySelector('p.medium_margin_bottom:not(.normal_fade)');

                if (!label || !value) return;
                if (value.querySelector('[data-modulr-copy]')) return;
                if (field.querySelector('[data-modulr-copy]')) return;

                const valueText = value.textContent.trim();
                if (!valueText || valueText.includes('Non renseigné') || valueText === '0') return;

                value.style.display = 'inline';
                value.after(createCopyBtn(valueText, 'Copier'));
            });

            // ===== NOM COMPLET (vcard_name) =====
            document.querySelectorAll('.vcard_name').forEach(el => {
                if (el.querySelector('[data-modulr-copy]')) return;
                const name = el.childNodes[0]?.textContent?.trim() || el.textContent.trim();
                if (name) {
                    el.appendChild(createCopyBtn(name, 'Copier le nom'));
                }
            });

            // ===== RAISON SOCIALE (vcard_company_name) =====
            document.querySelectorAll('.vcard_company_name').forEach(el => {
                if (el.nextElementSibling?.hasAttribute('data-modulr-copy')) return;
                const name = el.textContent.trim();
                if (name) {
                    el.after(createCopyBtn(name, 'Copier la raison sociale'));
                }
            });

            // ===== DEVIS - Descriptif =====
            document.querySelectorAll('.entity_info_block_1 td span.bold').forEach(span => {
                if (span.nextElementSibling?.hasAttribute('data-modulr-copy')) return;
                const text = span.textContent.trim();
                if (text && text.length > 2) {
                    span.after(createCopyBtn(text, 'Copier le descriptif'));
                }
            });

            // ===== CONTRATS - Référence uniquement =====
            document.querySelectorAll('#clients_policies_list .table_list tr.principal_row').forEach(tr => {
                const cells = tr.querySelectorAll('td.clients_policies_list_row_policy');

                cells.forEach(td => {
                    const fadeSpan = td.querySelector('span.fade');
                    if (!fadeSpan) return;
                    if (td.querySelector('[data-modulr-copy]')) return;

                    // La référence est le texte avant le <br>
                    const refText = td.childNodes[0]?.textContent?.trim();

                    if (refText && refText.length > 2) {
                        // Bouton pour la référence seulement
                        const btnRef = createCopyBtn(refText, 'Copier la référence');
                        btnRef.style.marginLeft = '5px';

                        const br = td.querySelector('br');
                        if (br) {
                            td.insertBefore(btnRef, br);
                        } else {
                            td.appendChild(btnRef);
                        }
                    }
                });
            });

            // ===== CONTRATS - Descriptif (ligne du dessous) =====
            document.querySelectorAll('#clients_policies_list tr.over_second_line td span.bold').forEach(span => {
                if (span.nextElementSibling?.hasAttribute('data-modulr-copy')) return;
                const text = span.textContent.trim();
                if (text && text.length > 2) {
                    span.after(createCopyBtn(text, 'Copier le descriptif'));
                }
            });

        } finally {
            isProcessing = false;
        }
    }

    // ========== INITIALISATION ==========
    function init() {
        addCopyButtons();

        let timeout;
        const observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(addCopyButtons, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
            characterData: false
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('.entity_menu_item')) {
                setTimeout(addCopyButtons, 400);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Modulr Copy v3.2 chargé');

})();
