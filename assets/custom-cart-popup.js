if (!customElements.get('cart-drawer-modal')) {
  class CartDrawerModal extends HTMLElement {
    constructor() {
      super();
      this.modalContent = null;
      this.closeButton = null;
      this.cartUpdates = {}; // Store quantity updates
    }

    connectedCallback() {
      this.modalContent = this.querySelector('.cart-drawer-modalinfo');
      this.closeButton = this.querySelector('.cart-drawer-modal-toggle');
      if (this.closeButton) {
        this.closeButton.addEventListener('click', this.close.bind(this));
      }

      document.addEventListener('click', (event) => {
        if (event.target.closest('.edit-btn')) {
          this.openEditPopup(event);
        }
    
        if (event.target.closest('.change-property-btn')) {
          this.handleChangeProperty(event);
        }
    
        if (event.target.closest('.remove-first-three-btn')) {
          this.removeFirstThreeItems(event);
        }
      });

    }
    

    disconnectedCallback() {
      if (this.closeButton) {
        this.closeButton.removeEventListener('click', this.close.bind(this));
      }
      document.querySelectorAll('.edit-btn').forEach(button => {
        button.removeEventListener('click', this.openEditPopup.bind(this));
      });
    }

    async openEditPopup(event) {
      event.preventDefault();
      const editBtn = event.target.closest('.edit-btn');
      if (!editBtn) return;

      const editProductUrl = editBtn.getAttribute("data-quick-url");
      if (!editProductUrl) {
        console.error("Error: Missing product URL!");
        return;
      }

      try {
        const response = await fetch(`${editProductUrl}?section_id=cart-custom-popup`);
        if (!response.ok) throw new Error("Failed to fetch product data");

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const content = doc.querySelector('.cart-drawer-modalinfo');

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
      }
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
            this.replaceCartVariant(productId, variantId, quantity);
          } else {
            console.error("No Product or Variant Selected!");
          }
        });
      });
    }

    async replaceCartVariant(productId, variantId, quantity) {
      try {
        const response = await fetch('/cart.js');
        const cartData = await response.json();
        
        let existingItem = cartData.items.find(item => item.product_id == productId);
        if (existingItem) {
          console.log("Removing Old Variant:", existingItem.variant_id);
          await fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updates: { [existingItem.id]: 0 },
              sections: ['cart-drawer', 'cart-icon-bubble'],
              sections_url: window.location.pathname
            })
          });
        }

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

    handleChangeProperty(event) {
      event.preventDefault(); 
      event.stopPropagation();
    
      const button = event.target.closest('.change-property-btn');
      if (!button) return;
    
      const lineItemKey = button.getAttribute("data-line");
      console.log("Line Item Key:", lineItemKey);
      const input = button.closest(".cart-item").querySelector("#second-property-input");
    
      if (!input) {
        console.error("Input field not found!");
        return;
      }
    
      if (button.innerText === "Change") {
        button.innerText = "Save";
        input.style.display = "inline-block";
        input.focus();
      } else {
        let newValue = input.value.trim();
        if (newValue !== "") {
          console.log("User entered:", newValue);         
          this.updateLineItemProperty(lineItemKey, newValue);
        }
        button.innerText = "Change";
        input.style.display = "none";
      }
    }
    
    
    async updateLineItemProperty(lineItemKey, newValue) {
      try {
        const cartResponse = await fetch('/cart.js');
        if (!cartResponse.ok) throw new Error("Failed to fetch cart data");
        
        const cartData = await cartResponse.json();
        
        const lineItem = cartData.items.find(item => item.key === lineItemKey);
        console.log(lineItem);
        if (!lineItem) throw new Error("Line item not found in cart");
    
        const updatedProperties = { ...lineItem.properties, "Second Line Item": newValue };
        console.log(updatedProperties);
    
        const updateResponse = await fetch('/cart/change.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: lineItemKey, 
            quantity: lineItem.quantity, 
            properties: updatedProperties,
            sections: ['cart-drawer', 'cart-icon-bubble'],
            sections_url: window.location.pathname 
          })
        });
    
        if (!updateResponse.ok) throw new Error("Failed to update cart");
    
        const updatedCartData = await updateResponse.json();
        console.log("Cart Updated:", updatedCartData);

        const cart = document.querySelector('cart-drawer');
        if (cart && cart.renderContents) {
          cart.renderContents(updatedCartData);
        }
      } catch (error) {
        console.error("Error updating cart:", error);
      }
    } 

    async removeFirstThreeItems() {
      try {
        // Fetch current cart data
        const response = await fetch('/cart.js');
        if (!response.ok) throw new Error("Failed to fetch cart data");
        
        const cartData = await response.json();
    
        // If there are 3 or fewer items, do nothing
        if (cartData.items.length <= 3) return;
    
        // Prepare update object to remove first 3 items
        const updates = {};
        cartData.items.slice(0, 3).forEach(item => {
          updates[item.key] = 0;
        });
    
        const updateResponse = await fetch('/cart/update.js', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates,
            sections: ['cart-drawer', 'cart-icon-bubble'],
            sections_url: window.location.pathname
          })
        });
    
        if (!updateResponse.ok) throw new Error("Failed to update cart");
    
        const updatedCartData = await updateResponse.json();
        console.log("Cart Updated:", updatedCartData);
    
        const cart = document.querySelector('cart-drawer');
        if (cart && cart.renderContents) {
          cart.renderContents(updatedCartData);
        }
    
      } catch (error) {
        console.error("❌ Error removing items:", error);
      }
    }
  }
  customElements.define('cart-drawer-modal', CartDrawerModal);
}
