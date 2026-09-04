import type { Schema, Struct } from '@strapi/strapi';

export interface ProductVariants extends Struct.ComponentSchema {
  collectionName: 'components_product_variants';
  info: {
    displayName: 'variants';
  };
  attributes: {
    price: Schema.Attribute.Integer & Schema.Attribute.Required;
    type: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'product.variants': ProductVariants;
    }
  }
}
