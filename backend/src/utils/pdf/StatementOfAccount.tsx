import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  firmInfo: { textAlign: 'right' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', textTransform: 'uppercase' },
  metaSection: { marginBottom: 20, borderBottom: 1, paddingBottom: 10 },
  table: { display: 'table', width: 'auto', marginTop: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#bfbfbf', minHeight: 25, alignItems: 'center' },
  tableHeader: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },
  colDate: { width: '15%' },
  colDesc: { width: '40%', paddingLeft: 5 },
  colRef: { width: '15%' },
  colDebit: { width: '10%', textAlign: 'right' },
  colCredit: { width: '10%', textAlign: 'right' },
  colBalance: { width: '10%', textAlign: 'right', fontWeight: 'bold' },
  summaryBox: { marginTop: 30, padding: 10, backgroundColor: '#f9f9f9', border: 1, borderColor: '#eee', width: '40%', alignSelf: 'flex-end' }
});

export const StatementOfAccount = ({ matter, transactions, firmDetails }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* 1. Header */}
      <View style={styles.header}>
        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{firmDetails.name}</Text>
        <View style={styles.firmInfo}>
          <Text>KRA PIN: {firmDetails.pin}</Text>
          <Text>{firmDetails.email}</Text>
        </View>
      </View>

      <Text style={styles.title}>Matter Statement of Account</Text>

      {/* 2. Client Info */}
      <View style={styles.metaSection}>
        <Text>Client: {matter.client.name}</Text>
        <Text>Matter: {matter.title}</Text>
        <Text>Date: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* 3. Financial Table */}
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.colDate}>Date</Text>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colRef}>Ref</Text>
          <Text style={styles.colDebit}>Debit</Text>
          <Text style={styles.colCredit}>Credit</Text>
          <Text style={styles.colBalance}>Balance</Text>
        </View>

        {transactions.map((tx, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colDate}>{tx.date}</Text>
            <Text style={styles.colDesc}>{tx.description}</Text>
            <Text style={styles.colRef}>{tx.ref}</Text>
            <Text style={styles.colDebit}>{tx.debit || '-'}</Text>
            <Text style={styles.colCredit}>{tx.credit || '-'}</Text>
            <Text style={styles.colBalance}>{tx.runningBalance}</Text>
          </View>
        ))}
      </View>

      {/* 4. Trust vs Office Summary */}
      <View style={styles.summaryBox}>
        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Position Summary</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>Trust Funds:</Text>
          <Text>{matter.trustBalance}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, borderTop: 1 }}>
          <Text style={{ fontWeight: 'bold' }}>Total Due:</Text>
          <Text style={{ fontWeight: 'bold' }}>{matter.totalBalance}</Text>
        </View>
      </View>
    </Page>
  </Document>
);