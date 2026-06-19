'use strict';

var RSGRadialMenu = null;

$(document).ready(function () {
    // One RadialMenu instance for the page lifetime — avoids accumulating
    // document-level wheel/keydown listeners and orphaned menuHolder nodes.
    RSGRadialMenu = new RadialMenu({
        parent    : document.body,
        size      : 375,
        menuItems : [],
        onClick   : function (item) {
            if (item.shouldClose) RSGRadialMenu.close(true);
            if (item.items == null && item.shouldClose != null) {
                $.post('https://rsg-radialmenu/selectItem', JSON.stringify({ itemData: item }));
            }
        }
    });

    // FIX: the original setClassAndWaitForTransition waits for a 'visibility'
    // transitionend that never fires (visibility is not in our transition list).
    // When it never fires the Promise never resolves, currentMenu is never cleared,
    // and every subsequent open() silently no-ops.
    // Override: resolve on 'opacity' or 'transform' end, with a 350ms fallback.
    RadialMenu.setClassAndWaitForTransition = function (node, newClass) {
        return new Promise(function (resolve) {
            var done = false;
            var timer = null;
            function finish() {
                if (done) return;
                done = true;
                clearTimeout(timer);
                node.removeEventListener('transitionend', onEnd);
                resolve();
            }
            function onEnd(e) {
                if (e.target === node &&
                    (e.propertyName === 'opacity' || e.propertyName === 'transform')) {
                    finish();
                }
            }
            node.addEventListener('transitionend', onEnd);
            node.setAttribute('class', newClass);
            timer = setTimeout(finish, 350); // fallback: always resolves
        });
    };

    window.addEventListener('message', function (event) {
        if (event.data.action !== 'ui') return;
        if (event.data.radial) {
            // If a previous close is still mid-animation, abort it cleanly so
            // rapid re-opens don't silently fail. The pending Promise's .then()
            // checks self.currentMenu !== null before removing — safe to null now.
            if (RSGRadialMenu.currentMenu) {
                RSGRadialMenu.currentMenu.remove();
                RSGRadialMenu.currentMenu = null;
            }
            RSGRadialMenu.menuItems = event.data.items;
            RSGRadialMenu.open();
        } else {
            RSGRadialMenu.close(true);
        }
    });
});

$(document).on('keydown', function (e) {
    if (e.key === 'Escape' && RSGRadialMenu) RSGRadialMenu.close();
});

// Key-up closes menu — supports hold-to-open keybind
$(document).on('keyup', function () {
    if (RSGRadialMenu) RSGRadialMenu.close();
});
