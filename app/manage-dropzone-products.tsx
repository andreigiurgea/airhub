import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { ArrowLeft, Plus, Edit, Trash2, Save, X } from 'lucide-react-native';
import { getDropzoneById } from '@/lib/dropzoneService';

interface Dropzone {
  id: string;
  name: string;
  currency?: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function ManageDropzoneProductsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dropzones, setDropzones] = useState<Dropzone[]>([]);
  const [selectedDropzone, setSelectedDropzone] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [dropzoneCurrency, setDropzoneCurrency] = useState<string>('AED');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    currency: 'AED',
    description: '',
    active: true,
  });

  useEffect(() => {
    loadDropzones();
  }, []);

  useEffect(() => {
    if (!selectedDropzone) return;

    console.log('Setting up real-time listeners for dropzone:', selectedDropzone);

    // Load dropzone currency
    const loadDropzoneCurrency = async () => {
      const dropzone = await getDropzoneById(selectedDropzone);
      if (dropzone?.currency) {
        setDropzoneCurrency(dropzone.currency);
      }
    };
    loadDropzoneCurrency();

    // Listen to shop_categories collection
    const categoriesRef = collection(db, 'dropzones', selectedDropzone, 'shop_categories');
    const unsubscribeCategories = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categoryList: Category[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          categoryList.push({
            id: doc.id,
            name: data.name || '',
          });
        });
        setCategories(categoryList);
        console.log(`📡 Categories updated: ${categoryList.length} categories loaded`);
      },
      (error) => {
        console.error('Error listening to categories:', error);
      }
    );

    // Listen to shop_products collection
    const productsRef = collection(db, 'dropzones', selectedDropzone, 'shop_products');
    const productsQuery = query(productsRef);

    const unsubscribeProducts = onSnapshot(
      productsQuery,
      (snapshot) => {
        const productList: Product[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          productList.push({
            id: doc.id,
            name: data.name || '',
            category: data.category || '',
            price: data.price || 0,
            currency: data.currency || 'AED',
            description: data.description || '',
            active: data.active !== false,
          });
        });
        setProducts(productList);
        console.log(`📡 Real-time update: ${productList.length} products loaded`);
      },
      (error) => {
        console.error('Error listening to products:', error);
      }
    );

    return () => {
      console.log('Cleaning up listeners for dropzone:', selectedDropzone);
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, [selectedDropzone]);

  const loadDropzones = async () => {
    try {
      setLoading(true);
      const dropzonesRef = collection(db, 'dropzones');
      const snapshot = await getDocs(dropzonesRef);

      const dzList: Dropzone[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        dzList.push({
          id: doc.id,
          name: data.name || 'Unnamed Dropzone',
        });
      });

      setDropzones(dzList);
      if (dzList.length > 0) {
        setSelectedDropzone(dzList[0].id);
      }
    } catch (error) {
      console.error('Error loading dropzones:', error);
      Alert.alert('Error', 'Failed to load dropzones');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = () => {
    setFormData({
      name: '',
      category: categories.length > 0 ? categories[0].id : '',
      price: '',
      currency: dropzoneCurrency,
      description: '',
      active: true,
    });
    setShowAddModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      currency: product.currency,
      description: product.description,
      active: product.active,
    });
    setShowEditModal(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name.trim() || !formData.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      const productsRef = collection(db, 'dropzones', selectedDropzone, 'shop_products');

      await addDoc(productsRef, {
        name: formData.name.trim(),
        category: formData.category,
        price: price,
        currency: formData.currency,
        description: formData.description.trim(),
        active: formData.active,
      });

      Alert.alert('Success', 'Product added successfully');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Error', 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    if (!formData.name.trim() || !formData.price) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    try {
      setSaving(true);
      const productRef = doc(db, 'dropzones', selectedDropzone, 'shop_products', editingProduct.id);

      await updateDoc(productRef, {
        name: formData.name.trim(),
        category: formData.category,
        price: price,
        currency: formData.currency,
        description: formData.description.trim(),
        active: formData.active,
      });

      Alert.alert('Success', 'Product updated successfully');
      setShowEditModal(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating product:', error);
      Alert.alert('Error', 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const productRef = doc(db, 'dropzones', selectedDropzone, 'shop_products', productId);
              await deleteDoc(productRef);
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const toggleProductActive = async (product: Product) => {
    try {
      const productRef = doc(db, 'dropzones', selectedDropzone, 'shop_products', product.id);
      await updateDoc(productRef, {
        active: !product.active,
      });
    } catch (error) {
      console.error('Error toggling product:', error);
      Alert.alert('Error', 'Failed to update product status');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  const renderProductForm = () => (
    <View style={styles.form}>
      <Text style={styles.formLabel}>Product Name *</Text>
      <TextInput
        style={styles.input}
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
        placeholder="Enter product name"
        placeholderTextColor="#999"
      />

      <Text style={styles.formLabel}>Category</Text>
      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                formData.category === cat.id && styles.categoryChipSelected
              ]}
              onPress={() => setFormData({ ...formData, category: cat.id })}
            >
              <Text style={[
                styles.categoryChipText,
                formData.category === cat.id && styles.categoryChipTextSelected
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noCategoriesText}>No categories available</Text>
      )}

      <Text style={styles.formLabel}>Price *</Text>
      <View style={styles.priceRow}>
        <TextInput
          style={[styles.input, styles.priceInput]}
          value={formData.price}
          onChangeText={(text) => setFormData({ ...formData, price: text })}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyText}>{formData.currency}</Text>
        </View>
      </View>

      <Text style={styles.formLabel}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
        placeholder="Enter product description"
        placeholderTextColor="#999"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={styles.activeToggle}
        onPress={() => setFormData({ ...formData, active: !formData.active })}
      >
        <View style={[styles.checkbox, formData.active && styles.checkboxChecked]} />
        <Text style={styles.activeLabel}>Active (Available for purchase)</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Products</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Products</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Dropzone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dropzoneScroll}>
            {dropzones.map((dz) => (
              <TouchableOpacity
                key={dz.id}
                style={[
                  styles.dropzoneCard,
                  selectedDropzone === dz.id && styles.dropzoneCardSelected
                ]}
                onPress={() => setSelectedDropzone(dz.id)}
              >
                <Text style={[
                  styles.dropzoneName,
                  selectedDropzone === dz.id && styles.dropzoneNameSelected
                ]}>
                  {dz.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Products ({products.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
              <Plus size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No products yet</Text>
              <Text style={styles.emptySubtext}>Add your first product to get started</Text>
            </View>
          ) : (
            products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productCategory}>{getCategoryName(product.category)}</Text>
                  </View>
                  <View style={styles.productActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditProduct(product)}
                    >
                      <Edit size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.productPrice}>{product.currency} {product.price.toFixed(2)}</Text>
                {product.description && (
                  <Text style={styles.productDescription}>{product.description}</Text>
                )}

                <TouchableOpacity
                  style={styles.statusToggle}
                  onPress={() => toggleProductActive(product)}
                >
                  <View style={[
                    styles.statusBadge,
                    product.active ? styles.statusActive : styles.statusInactive
                  ]}>
                    <Text style={[
                      styles.statusText,
                      product.active ? styles.statusTextActive : styles.statusTextInactive
                    ]}>
                      {product.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <Text style={styles.toggleHint}>Tap to toggle</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {renderProductForm()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Product</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {renderProductForm()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleUpdateProduct}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Update</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropzoneScroll: {
    marginBottom: 8,
  },
  dropzoneCard: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  dropzoneCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E8F4FF',
  },
  dropzoneName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  dropzoneNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
    color: '#666',
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 8,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#4CAF50',
  },
  statusTextInactive: {
    color: '#F44336',
  },
  toggleHint: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalScroll: {
    maxHeight: 400,
  },
  form: {
    padding: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
  },
  currencyBadge: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  currencyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  activeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCC',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  activeLabel: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
