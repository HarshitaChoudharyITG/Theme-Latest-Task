if (!customElements.get('product-grid-modal')) {
    class ProductGridModal extends HTMLElement {
      constructor() {
        super();
        this.modalContent = null;
        this.closeButton = null;
        this.cartUpdates = {};
      }
  
      connectedCallback() {
        this.modalContent = this.querySelector('.product-grid-modalinfo');
        this.closeButton = this.querySelector('.product-grid-modal-toggle');
        if (this.closeButton) {
          this.closeButton.addEventListener('click', this.close.bind(this));
        }
        document.addEventListener('click', (event) => {
          if (event.target.closest('.product-icon')) {
            this.openEditPopup(event);
          }
        });
      }
  
        disconnectedCallback() {
          if (this.closeButton) {
            this.closeButton.removeEventListener('click', this.close.bind(this));
          }
          document.querySelectorAll('.product-icon').forEach(button => {
            button.removeEventListener('click', this.openEditPopup.bind(this));
          });
        }
  
        async openEditPopup(event) {
        event.preventDefault();
        const editBtn = event.target.closest('.product-icon');
        if (!editBtn) return;
  
        // Show loader
        this.showLoader();
  
        const editProductUrl = editBtn.getAttribute("data-product-url");
        if (!editProductUrl) {
          this.hideLoader();
          console.error("Error: Missing product URL!");
          return;
        }
  
        try {
          const response = await fetch(`${editProductUrl}?section_id=product-grid-popup`);
          if (!response.ok) throw new Error("Failed to fetch product data");
  
          const htmlText = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlText, "text/html");
          const content = doc.querySelector('.product-grid-modalinfo');
  
          if (content && this.modalContent) {
            this.modalContent.innerHTML = content.innerHTML;
            this.classList.add('is-active');
            this.setAttribute('open', 'true');
            this.initializeOptions();
            this.initializeQuantityButtons();
            this.initializeCartButtons();
          }
        } catch (error) {
          console.error("Error fetching product data:", error);
        } finally {
          // Hide loader whether successful or not
          this.hideLoader();
        }
      }
  
      showLoader() {
        if (!this.modalContent) return;
        
        // Create loader HTML if it doesn't exist
        if (!this.querySelector('.modal-loader')) {
          const loader = document.createElement('div');
          loader.className = 'modal-loader';
          loader.innerHTML = `
            <div class="loader-spinner">
              <svg viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
              </svg>
            </div>
          `;
          this.modalContent.appendChild(loader);
        }
        
        // Show loader
        this.querySelector('.modal-loader')?.classList.add('active');
      }
  
      hideLoader() {
        this.querySelector('.modal-loader')?.classList.remove('active');
      }
  
      close() {
        this.classList.remove('is-active');
        this.removeAttribute('open');
        if (this.modalContent) {
          this.modalContent.innerHTML = '';
        }
      }
  
      initializeOptions() {
        document.querySelectorAll(".itg_select_option").forEach(select => {
          select.addEventListener("change", () => this.updateVariantID());
        });
        this.updateVariantID();
      }
  
      updateVariantID() {
        let selectedValues = Array.from(document.querySelectorAll(".itg_select_option"))
          .map(select => select.value)
          .join("-");
        console.log(selectedValues);
  
        let variantId = "", variantPrice = "", variantInventory = 0;
  
        document.querySelectorAll(".select-option-hidden option").forEach(option => {
          if (option.value === selectedValues) {
            variantId = option.getAttribute("data-id");
            variantPrice = option.getAttribute("data-price");
            variantInventory = parseInt(option.getAttribute("data-inventory") || "0", 10);
          }
        });
  
        if (variantId) {
          document.getElementById("selected-variant-id").value = variantId;
        }
  
        if (variantPrice) {
          const priceElement = document.getElementById("variant-price");
          if (priceElement) {
            priceElement.setAttribute("data-price", variantPrice);
            priceElement.innerHTML = variantPrice;
          }
        }
  
        const addToCartBtn = document.querySelector(".product-form_addbtn");
        if (addToCartBtn) {
          addToCartBtn.disabled = variantInventory <= 0;
          addToCartBtn.innerHTML = variantInventory <= 0 ? "Unavailable" : "Add to Cart";
        }
      }
  
      initializeQuantityButtons() {
        document.querySelectorAll('.quantity__button').forEach(button => {
          button.addEventListener('click', event => {
            const input = event.target.closest('.quantity-wrapper')?.querySelector('.quantity__input');
            //console.log(input);
            if (!input) return;
      
            let value = parseInt(input.value);
            //console.log(value);
            
            const variantId = document.getElementById("selected-variant-id")?.value;
            if (variantId) {
              this.cartUpdates[variantId] = value;
            }
          });
        });
      }
  
      initializeCartButtons() {
        document.querySelectorAll('.product-form_addbtn').forEach(button => {
          button.addEventListener('click', event => {
            event.preventDefault();
            const variantId = document.getElementById("selected-variant-id")?.value;
            const productId = document.getElementById("selected-product-id")?.value;
            const quantity = this.cartUpdates[variantId] || 1;
            console.log(quantity);
            
            if (productId && variantId) {
              // Show loader while adding to cart
              this.showLoader();
              this.addCartVariant(productId, variantId, quantity)
                .then(() => {
                  // Close popup after successful add to cart
                  this.close();
                })
                .catch(error => {
                  console.error("Error:", error);
                })
                .finally(() => {
                  this.hideLoader();
                });
            } else {
              console.error("No Product or Variant Selected!");
            }
          });
        });
      }
  
      async addCartVariant(productId, variantId, quantity) {
        try {
          const response = await fetch('/cart.js');
          const cartData = await response.json();   
  
          console.log("Adding New Variant:", variantId);
          const addResponse = await fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: variantId,
              quantity: quantity,
              sections: ['cart-drawer', 'cart-icon-bubble'],
              sections_url: window.location.pathname
            })
          });
          
          const newCartData = await addResponse.json();
          console.log("Cart Updated Successfully:", newCartData);
          
          const cart = document.querySelector('cart-drawer');
          if (cart && cart.renderContents) {
            cart.renderContents(newCartData);
          }
        } catch (error) {
          console.error("Error Updating Cart:", error);
        }
      }
      
    }
    customElements.define('product-grid-modal', ProductGridModal);
  }