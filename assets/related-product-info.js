if (!customElements.get('related-product-modal')) {
  class RelatedProductModal extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.attachEventListeners();
    }

    attachEventListeners() {
      document.querySelectorAll('.related-product-item a').forEach(button => {
        button.addEventListener('click', async event => {
          event.preventDefault();

          let mainContent = document.querySelector('#MainContent');
          let loader = document.createElement('div');
          loader.classList.add('loading-overlay');
          loader.innerHTML = `<div class="loader"></div>`;
          mainContent.appendChild(loader); 
         
          const url = new URL(button.href);
          const newUrl = url.pathname;
          history.replaceState(null, '', newUrl);

          const productHandle = url.pathname.replace('/products/', '');
          console.log('Product clicked: ' + productHandle);

          const mainProductSection = document.querySelector('.section-main-product');
          if (!mainProductSection) {
            console.error("Error: Main product section not found.");
            loader.style.display = 'none'; 
            return;
          }
          const mainSectionId = mainProductSection.getAttribute('id').replace('shopify-section-', '');

          const mainRelatedSection = document.querySelector('.section-related-product');
          if (!mainRelatedSection) {
            console.error("Error: Related product section not found.");
            loader.style.display = 'none'; 
            return;
          }
          const relatedSectionId = mainRelatedSection.getAttribute('id').replace('shopify-section-', '');

          try {
            const [mainResponse, relatedResponse] = await Promise.all([
              fetch(`/products/${productHandle}?section_id=${mainSectionId}`),
              fetch(`/products/${productHandle}?section_id=${relatedSectionId}`)
            ]);

            const mainData = await mainResponse.text();
            const relatedData = await relatedResponse.text();
            
            const mainParser = new DOMParser();
            const mainDoc = mainParser.parseFromString(mainData, "text/html");
            const newMainContent = mainDoc.querySelector('.section-main-product')?.innerHTML;

            if (newMainContent) {
              mainProductSection.innerHTML = newMainContent;
              console.log("Main product content updated!");
            } else {
              console.error("Error: Main product section not found in fetched data");
            }

            const relatedParser = new DOMParser();
            const relatedDoc = relatedParser.parseFromString(relatedData, "text/html");
            const newRelatedContent = relatedDoc.querySelector('.section-related-product')?.innerHTML;

            if (newRelatedContent) {
              mainRelatedSection.innerHTML = newRelatedContent;
              console.log("Related product content updated!");
            } else {
              console.error("Error: Related product section not found in fetched data");
            }

            const newModalContent = mainDoc.querySelector('product-modal');
            const existingModal = document.querySelector('product-modal');

            if (newModalContent && existingModal) {
              existingModal.innerHTML = newModalContent.innerHTML;
              console.log("Modal content updated!");
            } else {
              console.error("Error: Modal section not found in fetched data");
            }

          } catch (error) {
            console.error('Error fetching data:', error);
          }

          setTimeout(() => {
            loader.style.display = 'none';
          }, 1000);
        });
      });
    }
  }
  
  customElements.define('related-product-modal', RelatedProductModal);
}
