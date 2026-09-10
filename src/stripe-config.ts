export const stripeProducts = [
  {
    priceId: 'price_1S7QVPD53ZBucaGd7BqlVMnn', // Replace with your actual Stripe price ID
    name: 'Nano Banana AI Image Editor (150 Credits)',
    description: 'Generate or edit 150 images with the world\'s best Nano Banana AI image editor.',
    price: 22.00,
    credits: 150,
    mode: 'payment' as const,
  },
];

export const getProductByPriceId = (priceId: string) => {
  return stripeProducts.find(product => product.priceId === priceId);
};